import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  quotationsTable,
  quotationLineItemsTable,
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  ctcRulesTable,
  currenciesTable,
  systemSettingsTable,
} from "@workspace/db";
import {
  CreateQuotationBody,
  GetQuotationParams,
  UpdateQuotationParams,
  UpdateQuotationBody,
  DeleteQuotationParams,
  CreateQuotationLineItemParams,
  CreateQuotationLineItemBody,
  UpdateQuotationLineItemParams,
  UpdateQuotationLineItemBody,
  DeleteQuotationLineItemParams,
  CreateQuotationFromProjectionParams,
} from "@workspace/api-zod";
import { computeScenario, normalizeMarginToFraction } from "../lib/summary";

const router: IRouter = Router();

async function getQuotationWithLineItems(quotationId: number) {
  const [quotation] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, quotationId));
  if (!quotation) return null;
  const lineItems = await db.select().from(quotationLineItemsTable).where(eq(quotationLineItemsTable.quotationId, quotationId)).orderBy(quotationLineItemsTable.sortOrder);
  return { ...quotation, lineItems };
}

router.get("/quotations", async (_req, res): Promise<void> => {
  const quotations = await db.select().from(quotationsTable).orderBy(quotationsTable.createdAt);
  res.json(quotations);
});

router.post("/quotations", async (req, res): Promise<void> => {
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db.insert(quotationsTable).values(parsed.data).returning();
  const result = await getQuotationWithLineItems(quotation.id);
  res.status(201).json(result);
});

router.post("/quotations/from-projection/:projectionId", async (req, res): Promise<void> => {
  const params = CreateQuotationFromProjectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const projectionId = params.data.projectionId;

  const [projection] = await db.select().from(projectionsTable).where(eq(projectionsTable.id, projectionId));
  if (!projection) {
    res.status(404).json({ error: "Projection not found" });
    return;
  }

  const [employees, subscriptions, salesResources, ctcRules, currencies, settingsRows] = await Promise.all([
    db.select().from(employeesTable).where(eq(employeesTable.projectionId, projectionId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, projectionId)),
    db.select().from(salesSupportResourcesTable).where(eq(salesSupportResourcesTable.projectionId, projectionId)),
    db.select().from(ctcRulesTable),
    db.select().from(currenciesTable),
    db.select().from(systemSettingsTable),
  ]);

  const settings = settingsRows[0];
  // Compute the scenario WITHOUT one-time subscriptions so the per-client
  // managed services price excludes one-time costs. One-time costs are
  // surfaced as their own line items below to avoid double-billing.
  const recurringSubs = subscriptions.filter((s) => !s.isOneTime);
  const scenario = computeScenario({
    projection,
    employees,
    subscriptions: recurringSubs,
    salesResources,
    ctcRules,
    currencies,
  });

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;
  const compact = `${yyyy}${mm}${dd}`;
  const prefix = settings?.quotationPrefix ?? "Q-";
  const companyName = settings?.companyName ?? "Your Company";
  const quotationNumber = `${prefix}${compact}-${String(projectionId).padStart(2, "0")}`;

  const [quotation] = await db.insert(quotationsTable).values({
    projectionId,
    quotationNumber,
    companyName,
    clientName: `Client (${projection.yearLabel})`,
    date: today,
    status: "draft",
    termsText: settings?.termsText ?? null,
  }).returning();

  const lineItems: Array<{
    quotationId: number;
    sortOrder: number;
    description: string;
    quantity: number;
    unit: string;
    priceMonthly: number;
    totalMonths: number;
  }> = [];
  let sortOrder = 0;

  const numClients = projection.numClients ?? 0;
  if (numClients > 0 && scenario.sellingPriceWithoutVat > 0) {
    lineItems.push({
      quotationId: quotation.id,
      sortOrder: sortOrder++,
      description: `Managed Services - Monthly Fee per Client (${projection.yearLabel})`,
      quantity: numClients,
      unit: "client",
      priceMonthly: Math.round(scenario.sellingPriceWithoutVat * 100) / 100,
      totalMonths: 12,
    });
  }

  for (const r of salesResources) {
    const ctcRule = ctcRules.find(
      (rule) =>
        rule.isActive &&
        (rule.countryCode.toLowerCase() === r.country.toLowerCase() ||
          rule.countryName.toLowerCase() === r.country.toLowerCase()),
    );
    const multiplier = ctcRule ? ctcRule.ctcMultiplier : 1.0;
    const monthlyCost = r.salarySar * multiplier;
    const marginFraction = normalizeMarginToFraction(r.marginPercent);
    const sellingMonthly = marginFraction < 1 ? monthlyCost / (1 - marginFraction) : monthlyCost;
    if (sellingMonthly <= 0) continue;
    lineItems.push({
      quotationId: quotation.id,
      sortOrder: sortOrder++,
      description: `Sales Support Resource - ${r.title} (${r.country})`,
      quantity: 1,
      unit: "resource",
      priceMonthly: Math.round(sellingMonthly * 100) / 100,
      totalMonths: r.months,
    });
  }

  for (const sub of subscriptions) {
    if (!sub.isOneTime) continue;
    const rate = sub.currency === "SAR" ? 1.0 : (currencies.find((c) => c.code === sub.currency)?.rateToSar ?? 1.0);
    const sarAmount = sub.originalPrice * rate;
    if (sarAmount <= 0) continue;
    lineItems.push({
      quotationId: quotation.id,
      sortOrder: sortOrder++,
      description: `One-time: ${sub.name}`,
      quantity: 1,
      unit: "one-time",
      priceMonthly: Math.round(sarAmount * 100) / 100,
      totalMonths: 1,
    });
  }

  if (lineItems.length > 0) {
    await db.insert(quotationLineItemsTable).values(lineItems);
  }

  const result = await getQuotationWithLineItems(quotation.id);
  res.status(201).json(result);
});

router.get("/quotations/:id", async (req, res): Promise<void> => {
  const params = GetQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getQuotationWithLineItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(result);
});

router.put("/quotations/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db.update(quotationsTable).set(parsed.data).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const result = await getQuotationWithLineItems(quotation.id);
  res.json(result);
});

router.delete("/quotations/:id", async (req, res): Promise<void> => {
  const params = DeleteQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quotation] = await db.delete(quotationsTable).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quotations/:quotationId/line-items", async (req, res): Promise<void> => {
  const params = CreateQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateQuotationLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(quotationLineItemsTable).values({ ...parsed.data, quotationId: params.data.quotationId }).returning();
  res.status(201).json(item);
});

router.put("/quotations/:quotationId/line-items/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.update(quotationLineItemsTable).set(parsed.data).where(eq(quotationLineItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }
  res.json(item);
});

router.delete("/quotations/:quotationId/line-items/:id", async (req, res): Promise<void> => {
  const params = DeleteQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db.delete(quotationLineItemsTable).where(eq(quotationLineItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
