import { Router, type IRouter } from "express";
import { eq, and, or, isNull, inArray, gte, lte, type SQL } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceLineItemsTable,
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  vendorSetupFeesTable,
  infrastructureCostsTable,
  ctcRulesTable,
  currenciesTable,
  systemSettingsTable,
} from "@workspace/db";
import {
  ListInvoicesQueryParams as ListInvoicesQuery,
  GetInvoiceCalendarQueryParams as GetInvoiceCalendarQuery,
} from "@workspace/api-zod";
import * as zod from "zod";
const z = zod;
import { requireAuth } from "../lib/auth";
import { normalizeMarginToFraction, computeScenario } from "../lib/summary";

type InvoiceRow = typeof invoicesTable.$inferSelect;
type InvoiceWithTotals = InvoiceRow & { subtotal: number; vatTotal: number; grandTotal: number };
type AuthCtx = { userId: string; role: string };

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const InvoiceIdParam = z.object({ invoiceId: z.coerce.number().int().positive() });
const InvoiceIdAndIdParams = z.object({
  invoiceId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

const UpdateInvoiceBody = z.object({
  clientName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  paidDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  vatRate: z.number().optional(),
});

const CreateLineBody = z.object({
  sortOrder: z.number().int().optional(),
  description: z.string().min(1),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  marginPercent: z.number().optional(),
  vatRate: z.number().optional(),
});

const UpdateLineBody = CreateLineBody.partial();

const GenerateBody = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

function monthsBetweenInclusive(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function lineTotals(li: { quantity: number; unitPrice: number; marginPercent: number; vatRate: number }) {
  const margin = normalizeMarginToFraction(li.marginPercent);
  const sellingUnit = margin < 1 ? li.unitPrice / (1 - margin) : li.unitPrice;
  const subtotal = sellingUnit * (li.quantity ?? 1);
  const vatFrac = li.vatRate > 1 ? li.vatRate / 100 : li.vatRate;
  const vat = subtotal * vatFrac;
  return {
    lineSubtotal: r2(subtotal),
    lineVat: r2(vat),
    lineTotal: r2(subtotal + vat),
  };
}

async function loadInvoiceWithTotals(id: number, ctx: AuthCtx) {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) return { invoice: null as null, forbidden: false };
  if (ctx.role !== "admin" && invoice.ownerId && invoice.ownerId !== ctx.userId) {
    return { invoice: null as null, forbidden: true };
  }
  const lineItems = await db
    .select()
    .from(invoiceLineItemsTable)
    .where(eq(invoiceLineItemsTable.invoiceId, id))
    .orderBy(invoiceLineItemsTable.sortOrder);
  let subtotal = 0;
  let vatTotal = 0;
  const enriched = lineItems.map((li) => {
    const t = lineTotals(li);
    subtotal += t.lineSubtotal;
    vatTotal += t.lineVat;
    return { ...li, ...t };
  });
  return {
    invoice: {
      ...invoice,
      subtotal: r2(subtotal),
      vatTotal: r2(vatTotal),
      grandTotal: r2(subtotal + vatTotal),
      lineItems: enriched,
    },
    forbidden: false,
  };
}

function ownerScope(ctx: AuthCtx): SQL | undefined {
  if (ctx.role === "admin") return undefined;
  return or(eq(invoicesTable.ownerId, ctx.userId), isNull(invoicesTable.ownerId));
}

async function withInvoiceTotals(rows: InvoiceRow[]): Promise<InvoiceWithTotals[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const lines = await db.select().from(invoiceLineItemsTable).where(inArray(invoiceLineItemsTable.invoiceId, ids));
  const byInv = new Map<number, { subtotal: number; vatTotal: number }>();
  for (const li of lines) {
    const t = lineTotals(li);
    const cur = byInv.get(li.invoiceId) ?? { subtotal: 0, vatTotal: 0 };
    cur.subtotal += t.lineSubtotal;
    cur.vatTotal += t.lineVat;
    byInv.set(li.invoiceId, cur);
  }
  return rows.map((r) => {
    const t = byInv.get(r.id) ?? { subtotal: 0, vatTotal: 0 };
    return {
      ...r,
      subtotal: r2(t.subtotal),
      vatTotal: r2(t.vatTotal),
      grandTotal: r2(t.subtotal + t.vatTotal),
    };
  });
}

function autoMarkOverdue(rows: InvoiceRow[]): InvoiceRow[] {
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => {
    if (r.status === "sent" && r.dueDate < today) {
      return { ...r, status: "overdue" };
    }
    return r;
  });
}

router.get("/invoices", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const q = ListInvoicesQuery.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const conds: SQL[] = [];
  const owner = ownerScope(ctx);
  if (owner) conds.push(owner);
  if (q.data.projectionId) conds.push(eq(invoicesTable.projectionId, q.data.projectionId));
  if (q.data.month) conds.push(eq(invoicesTable.billingMonth, q.data.month));
  const where = conds.length ? and(...conds) : undefined;
  const rows = where
    ? await db.select().from(invoicesTable).where(where).orderBy(invoicesTable.dueDate)
    : await db.select().from(invoicesTable).orderBy(invoicesTable.dueDate);
  const marked = autoMarkOverdue(rows);
  const filtered = q.data.status ? marked.filter((r) => r.status === q.data.status) : marked;
  const enriched = await withInvoiceTotals(filtered);
  res.json(enriched);
});

router.get("/invoices/calendar", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const q = GetInvoiceCalendarQuery.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const conds: SQL[] = [];
  const owner = ownerScope(ctx);
  if (owner) conds.push(owner);
  if (q.data.projectionId) conds.push(eq(invoicesTable.projectionId, q.data.projectionId));
  if (q.data.from) conds.push(gte(invoicesTable.billingMonth, q.data.from));
  if (q.data.to) conds.push(lte(invoicesTable.billingMonth, q.data.to));
  const where = conds.length ? and(...conds) : undefined;
  const rows = where
    ? await db.select().from(invoicesTable).where(where).orderBy(invoicesTable.billingMonth)
    : await db.select().from(invoicesTable).orderBy(invoicesTable.billingMonth);
  const enriched = await withInvoiceTotals(autoMarkOverdue(rows));

  type CalendarCell = {
    month: string;
    invoiceCount: number;
    totalDue: number;
    totalPaid: number;
    totalOutstanding: number;
    statusCounts: { draft: number; sent: number; paid: number; overdue: number };
    invoices: InvoiceWithTotals[];
  };
  const months = new Map<string, CalendarCell>();
  const emptyCell = (month: string): CalendarCell => ({
    month,
    invoiceCount: 0,
    totalDue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    statusCounts: { draft: 0, sent: 0, paid: 0, overdue: 0 },
    invoices: [],
  });
  for (const inv of enriched) {
    if (!months.has(inv.billingMonth)) months.set(inv.billingMonth, emptyCell(inv.billingMonth));
    const cell = months.get(inv.billingMonth)!;
    cell.invoiceCount += 1;
    cell.totalDue += inv.grandTotal;
    if (inv.status === "paid") cell.totalPaid += inv.grandTotal;
    else cell.totalOutstanding += inv.grandTotal;
    const sk = inv.status as "draft" | "sent" | "paid" | "overdue";
    if (sk in cell.statusCounts) cell.statusCounts[sk] += 1;
    cell.invoices.push(inv);
  }
  const sortedMonths = Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  for (const m of sortedMonths) {
    m.totalDue = r2(m.totalDue);
    m.totalPaid = r2(m.totalPaid);
    m.totalOutstanding = r2(m.totalOutstanding);
  }
  const totals = sortedMonths.reduce(
    (acc, m) => ({
      invoiceCount: acc.invoiceCount + m.invoiceCount,
      totalDue: acc.totalDue + m.totalDue,
      totalPaid: acc.totalPaid + m.totalPaid,
      totalOutstanding: acc.totalOutstanding + m.totalOutstanding,
    }),
    { invoiceCount: 0, totalDue: 0, totalPaid: 0, totalOutstanding: 0 },
  );
  totals.totalDue = r2(totals.totalDue);
  totals.totalPaid = r2(totals.totalPaid);
  totals.totalOutstanding = r2(totals.totalOutstanding);
  res.json({ months: sortedMonths, totals });
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { invoice, forbidden } = await loadInvoiceWithTotals(params.data.id, ctx);
  if (forbidden) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(invoice);
});

router.put("/invoices/:id", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateInvoiceBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (ctx.role !== "admin" && existing.ownerId && existing.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const update: Record<string, unknown> = { ...body.data };
  if (body.data.status === "paid" && !body.data.paidDate && !existing.paidDate) {
    update.paidDate = new Date().toISOString().slice(0, 10);
  }
  if (body.data.status && body.data.status !== "paid") {
    if (body.data.paidDate === undefined) update.paidDate = null;
  }
  await db.update(invoicesTable).set(update).where(eq(invoicesTable.id, params.data.id));
  const { invoice } = await loadInvoiceWithTotals(params.data.id, ctx);
  res.json(invoice);
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (ctx.role !== "admin" && existing.ownerId && existing.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/invoices/:invoiceId/line-items", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = InvoiceIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = CreateLineBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.invoiceId));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (ctx.role !== "admin" && existing.ownerId && existing.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const [row] = await db.insert(invoiceLineItemsTable).values({
    invoiceId: params.data.invoiceId,
    sortOrder: body.data.sortOrder ?? 0,
    description: body.data.description,
    quantity: body.data.quantity ?? 1,
    unitPrice: body.data.unitPrice ?? 0,
    marginPercent: body.data.marginPercent ?? 0,
    vatRate: body.data.vatRate ?? existing.vatRate,
    isManual: true,
  }).returning();
  res.status(201).json({ ...row, ...lineTotals(row) });
});

router.put("/invoices/:invoiceId/line-items/:id", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = InvoiceIdAndIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = UpdateLineBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.invoiceId));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (ctx.role !== "admin" && existing.ownerId && existing.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const [row] = await db.update(invoiceLineItemsTable)
    .set(body.data)
    .where(and(eq(invoiceLineItemsTable.id, params.data.id), eq(invoiceLineItemsTable.invoiceId, params.data.invoiceId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Line item not found" }); return; }
  res.json({ ...row, ...lineTotals(row) });
});

router.delete("/invoices/:invoiceId/line-items/:id", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = InvoiceIdAndIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.invoiceId));
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  if (ctx.role !== "admin" && existing.ownerId && existing.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const [row] = await db.delete(invoiceLineItemsTable)
    .where(and(eq(invoiceLineItemsTable.id, params.data.id), eq(invoiceLineItemsTable.invoiceId, params.data.invoiceId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Line item not found" }); return; }
  res.sendStatus(204);
});

export async function generateInvoicesForProjection(opts: {
  projectionId: number;
  fromMonth: string;
  toMonth: string;
  ownerId: string;
}): Promise<{ created: number; updated: number; skipped: number; invoices: InvoiceRow[] }> {
  const { projectionId, fromMonth, toMonth, ownerId } = opts;

  const [projection] = await db.select().from(projectionsTable).where(eq(projectionsTable.id, projectionId));
  if (!projection) throw new Error("Projection not found");

  const [employees, subscriptions, salesResources, vendorSetupFees, infraCosts, ctcRules, currencies, settingsRows] =
    await Promise.all([
      db.select().from(employeesTable).where(eq(employeesTable.projectionId, projectionId)),
      db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, projectionId)),
      db.select().from(salesSupportResourcesTable).where(eq(salesSupportResourcesTable.projectionId, projectionId)),
      db.select().from(vendorSetupFeesTable).where(eq(vendorSetupFeesTable.projectionId, projectionId)),
      db.select().from(infrastructureCostsTable).where(eq(infrastructureCostsTable.projectionId, projectionId)),
      db.select().from(ctcRulesTable),
      db.select().from(currenciesTable),
      db.select().from(systemSettingsTable),
    ]);

  const settings = settingsRows[0];
  const prefix = settings?.quotationPrefix ?? "INV-";
  const companyName = settings?.companyName ?? "Your Company";
  const baseCurrency = settings?.baseCurrencyCode ?? "SAR";
  const vatRate = projection.vatRate && projection.vatRate > 0
    ? (projection.vatRate > 1 ? projection.vatRate / 100 : projection.vatRate)
    : 0.15;
  const numClients = Math.max(1, projection.numClients ?? 1);
  const invoiceDay = Math.min(28, Math.max(1, projection.invoiceDayOfMonth ?? 1));
  const termsDays = Math.max(0, projection.invoicePaymentTermsDays ?? 30);

  // Compute full scenario to get selling prices
  const scenario = computeScenario({
    projection,
    employees,
    subscriptions,
    salesResources,
    vendorSetupFees,
    infrastructureCosts: infraCosts,
    ctcRules,
    currencies,
  });

  const months = monthsBetweenInclusive(fromMonth, toMonth);
  const allMonths = months.sort();

  // Derive fiscal-year label for invoice numbering (e.g., "2026-27")
  const fyLabel = projection.fiscalYear ? projection.fiscalYear.trim() : "";
  const fyPrefix = fyLabel ? `FY${fyLabel}-` : "";

  let created = 0, updated = 0, skipped = 0;
  const writtenInvoices: InvoiceRow[] = [];

  for (let clientIdx = 1; clientIdx <= numClients; clientIdx += 1) {
    const clientKey = `client-${clientIdx}`;
    const clientName = `Client ${clientIdx}`;

    // Determine the setup month: prefer the projection's explicit startMonth if set,
    // otherwise fall back to the earliest billing month ever generated for this client
    // across ALL months (not just the current range), ensuring setup charges always
    // appear in the true first month of the engagement.
    let setupMonth: string;
    if (projection.startMonth) {
      setupMonth = projection.startMonth;
    } else {
      const priorMonths = await db
        .select({ billingMonth: invoicesTable.billingMonth })
        .from(invoicesTable)
        .where(and(
          eq(invoicesTable.projectionId, projectionId),
          eq(invoicesTable.clientKey, clientKey),
        ));
      const allKnownMonths = [...priorMonths.map((r) => r.billingMonth), ...allMonths].sort();
      setupMonth = allKnownMonths[0];
    }

    for (let mi = 0; mi < allMonths.length; mi += 1) {
      const month = allMonths[mi];
      const isSetupMonth = month === setupMonth;
      const issueDate = `${month}-${String(invoiceDay).padStart(2, "0")}`;
      const dueDate = addDays(issueDate, termsDays);

      const [existing] = await db.select().from(invoicesTable).where(
        and(
          eq(invoicesTable.projectionId, projectionId),
          eq(invoicesTable.clientKey, clientKey),
          eq(invoicesTable.billingMonth, month),
        ),
      );

      let invoiceId: number;
      if (existing) {
        if (existing.status === "paid" || existing.status === "sent") {
          skipped += 1;
          writtenInvoices.push(existing);
          continue;
        }
        invoiceId = existing.id;
        updated += 1;
      } else {
        const invoiceNumber = `${prefix}${fyPrefix}${month.replace("-", "")}-P${projectionId}-C${clientIdx}`;
        const [ins] = await db.insert(invoicesTable).values({
          ownerId,
          projectionId,
          invoiceNumber,
          clientKey,
          clientName,
          companyName,
          billingMonth: month,
          issueDate,
          dueDate,
          status: "draft",
          currencyCode: baseCurrency,
          vatRate,
        }).returning();
        invoiceId = ins.id;
        created += 1;
      }

      // Delete auto-generated lines; keep manual ones
      await db.delete(invoiceLineItemsTable).where(
        and(
          eq(invoiceLineItemsTable.invoiceId, invoiceId),
          eq(invoiceLineItemsTable.isManual, false),
        ),
      );

      const newLines: Array<typeof invoiceLineItemsTable.$inferInsert> = [];
      let sortOrder = 0;

      if (isSetupMonth) {
        // ─── Invoice #1: Setup Invoice ───────────────────────────────────────
        // Stream C: Vendor Setup Fee lines (one per fee, per-client price, margin already in the fee)
        for (const vs of scenario.vendorSetupLines) {
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: vs.name || vs.vendorName || "Setup Fee",
            quantity: 1,
            // unitPrice is the COST ex-VAT; marginPercent applies markup
            unitPrice: r2(vs.amountSar),
            marginPercent: (vs.sellingSar > 0 && vs.amountSar > 0)
              ? r2((1 - vs.amountSar / vs.sellingSar) * 100)
              : 0,
            vatRate,
            sourceKind: "vendor_setup_fee",
            sourceRefId: vs.id,
            isManual: false,
          });
        }

        // Stream D: Infrastructure one-time lines (one line per item, per-client selling price)
        for (const infra of scenario.infrastructureLines) {
          if (!infra.isOneTime || infra.oneTimeSellingSar <= 0) continue;
          const perClientSelling = numClients > 0 ? infra.oneTimeSellingSar / numClients : infra.oneTimeSellingSar;
          if (perClientSelling <= 0) continue;
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: `${infra.name} (One-Time Setup)`,
            quantity: 1,
            unitPrice: r2(perClientSelling),
            marginPercent: 0,
            vatRate,
            sourceKind: "infrastructure_cost",
            sourceRefId: infra.id,
            isManual: false,
          });
        }

        // Stream A: Core Platform Month 1
        if (scenario.coreSellExVatMonthly > 0) {
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: "Core Platform — Month 1",
            quantity: 1,
            unitPrice: r2(scenario.coreSellExVatMonthly),
            marginPercent: 0,
            vatRate,
            sourceKind: "core_platform",
            sourceRefId: null,
            isManual: false,
          });
        }

        // Stream B: Managed Services Month 1
        if (scenario.msSellExVatMonthly > 0) {
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: "Managed Services — Month 1",
            quantity: 1,
            unitPrice: r2(scenario.msSellExVatMonthly),
            marginPercent: 0,
            vatRate,
            sourceKind: "managed_services",
            sourceRefId: null,
            isManual: false,
          });
        }
      } else {
        // ─── Invoices #2-12: Recurring ───────────────────────────────────────
        // Stream A: Core Platform recurring
        if (scenario.coreSellExVatMonthly > 0) {
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: "Core Platform — Monthly Recurring",
            quantity: 1,
            unitPrice: r2(scenario.coreSellExVatMonthly),
            marginPercent: 0,
            vatRate,
            sourceKind: "core_platform",
            sourceRefId: null,
            isManual: false,
          });
        }

        // Stream B: Managed Services recurring
        if (scenario.msSellExVatMonthly > 0) {
          newLines.push({
            invoiceId,
            sortOrder: sortOrder++,
            description: "Managed Services — Monthly Recurring",
            quantity: 1,
            unitPrice: r2(scenario.msSellExVatMonthly),
            marginPercent: 0,
            vatRate,
            sourceKind: "managed_services",
            sourceRefId: null,
            isManual: false,
          });
        }
      }

      if (newLines.length > 0) {
        await db.insert(invoiceLineItemsTable).values(newLines);
      }

      const [refreshed] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
      if (refreshed) writtenInvoices.push(refreshed);
    }
  }

  return { created, updated, skipped, invoices: writtenInvoices };
}

router.post("/projections/:id/invoices/generate", async (req, res): Promise<void> => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = GenerateBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [projection] = await db.select().from(projectionsTable).where(eq(projectionsTable.id, params.data.id));
  if (!projection) { res.status(404).json({ error: "Projection not found" }); return; }
  if (ctx.role !== "admin" && projection.ownerId && projection.ownerId !== ctx.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  try {
    const result = await generateInvoicesForProjection({
      projectionId: params.data.id,
      fromMonth: body.data.fromMonth,
      toMonth: body.data.toMonth,
      ownerId: projection.ownerId ?? ctx.userId,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
