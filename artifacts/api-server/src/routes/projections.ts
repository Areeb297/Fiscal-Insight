import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectionsTable, employeesTable, subscriptionsTable, salesSupportResourcesTable, ctcRulesTable, currenciesTable } from "@workspace/db";
import {
  CreateProjectionBody,
  GetProjectionParams,
  UpdateProjectionParams,
  UpdateProjectionBody,
  GetProjectionSummaryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projections", async (_req, res): Promise<void> => {
  const projections = await db.select().from(projectionsTable).orderBy(projectionsTable.createdAt);
  res.json(projections);
});

router.post("/projections", async (req, res): Promise<void> => {
  const parsed = CreateProjectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [projection] = await db.insert(projectionsTable).values(parsed.data).returning();
  res.status(201).json(projection);
});

router.get("/projections/:id", async (req, res): Promise<void> => {
  const params = GetProjectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [projection] = await db.select().from(projectionsTable).where(eq(projectionsTable.id, params.data.id));
  if (!projection) {
    res.status(404).json({ error: "Projection not found" });
    return;
  }
  res.json(projection);
});

router.put("/projections/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [projection] = await db.update(projectionsTable).set(parsed.data).where(eq(projectionsTable.id, params.data.id)).returning();
  if (!projection) {
    res.status(404).json({ error: "Projection not found" });
    return;
  }
  res.json(projection);
});

function normalizeMarginToFraction(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1 ? raw / 100 : raw;
}

async function getCtcMultiplier(country: string): Promise<number> {
  const rules = await db.select().from(ctcRulesTable).where(eq(ctcRulesTable.isActive, true));
  const rule = rules.find(r => r.countryCode.toLowerCase() === country.toLowerCase() || r.countryName.toLowerCase() === country.toLowerCase());
  return rule ? rule.ctcMultiplier : 1.0;
}

async function getCurrencyRate(currencyCode: string): Promise<number> {
  const [currency] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, currencyCode));
  return currency ? currency.rateToSar : 1.0;
}

router.get("/projections/:id/summary", async (req, res): Promise<void> => {
  const params = GetProjectionSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [projection] = await db.select().from(projectionsTable).where(eq(projectionsTable.id, params.data.id));
  if (!projection) {
    res.status(404).json({ error: "Projection not found" });
    return;
  }

  const employees = await db.select().from(employeesTable).where(eq(employeesTable.projectionId, params.data.id));
  const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, params.data.id));
  const salesResources = await db.select().from(salesSupportResourcesTable).where(eq(salesSupportResourcesTable.projectionId, params.data.id));

  let totalDeptCostYearly = 0;
  for (const emp of employees) {
    const multiplier = await getCtcMultiplier(emp.country);
    const ctc = emp.salarySar * multiplier;
    totalDeptCostYearly += ctc * emp.monthsFte;
  }

  const costPerClientYearly = projection.numClients > 0 ? totalDeptCostYearly / projection.numClients : 0;
  const costPerClientMonthly = costPerClientYearly / 12;

  let totalOverheadMonthly = 0;
  for (const sub of subs) {
    const rate = sub.currency === "SAR" ? 1.0 : await getCurrencyRate(sub.currency);
    totalOverheadMonthly += sub.originalPrice * rate;
  }
  const totalOverheadYearly = totalOverheadMonthly * 12;

  const overheadPerClient = projection.numClients > 0 ? totalOverheadMonthly / projection.numClients : 0;
  const totalMonthlyCostPerClient = costPerClientMonthly + overheadPerClient;
  const marginFraction = normalizeMarginToFraction(projection.marginPercent);
  const sellingPriceWithoutVat = marginFraction < 1 ? totalMonthlyCostPerClient / (1 - marginFraction) : totalMonthlyCostPerClient;
  const marginSarMonthly = sellingPriceWithoutVat - totalMonthlyCostPerClient;
  const marginSarYearly = marginSarMonthly * 12;
  const sellingPriceWithVatMonthly = sellingPriceWithoutVat * 1.15;
  const sellingPriceWithVatYearly = sellingPriceWithVatMonthly * 12;

  let salesSupportTotalCost = 0;
  let salesSupportMarginFraction = 0.30;
  for (const r of salesResources) {
    const multiplier = await getCtcMultiplier(r.country);
    const ctc = r.salarySar * multiplier;
    salesSupportTotalCost += ctc * r.months;
    salesSupportMarginFraction = normalizeMarginToFraction(r.marginPercent);
  }
  const salesSupportSellingPrice = salesSupportMarginFraction < 1 ? salesSupportTotalCost / (1 - salesSupportMarginFraction) : salesSupportTotalCost;

  res.json({
    projection,
    totalDeptCostYearly,
    costPerClientYearly,
    costPerClientMonthly,
    totalOverheadMonthly,
    totalOverheadYearly,
    totalMonthlyCostPerClient,
    sellingPriceWithoutVat,
    marginSarMonthly,
    marginSarYearly,
    sellingPriceWithVatMonthly,
    sellingPriceWithVatYearly,
    salesSupportTotalCost,
    salesSupportSellingPrice,
    employeeCount: employees.length,
    subscriptionCount: subs.length,
    salesSupportCount: salesResources.length,
  });
});

export default router;
export { getCtcMultiplier, getCurrencyRate };
