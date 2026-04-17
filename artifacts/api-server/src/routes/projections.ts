import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectionsTable, employeesTable, subscriptionsTable, salesSupportResourcesTable, ctcRulesTable, currenciesTable } from "@workspace/db";
import {
  CreateProjectionBody,
  GetProjectionParams,
  UpdateProjectionParams,
  UpdateProjectionBody,
  GetProjectionSummaryParams,
  DeleteProjectionParams,
} from "@workspace/api-zod";
import { computeScenario } from "../lib/summary";

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

async function getCtcMultiplier(country: string): Promise<number> {
  const rules = await db.select().from(ctcRulesTable).where(eq(ctcRulesTable.isActive, true));
  const rule = rules.find(r => r.countryCode.toLowerCase() === country.toLowerCase() || r.countryName.toLowerCase() === country.toLowerCase());
  return rule ? rule.ctcMultiplier : 1.0;
}

async function getCurrencyRate(currencyCode: string): Promise<number> {
  const [currency] = await db.select().from(currenciesTable).where(eq(currenciesTable.code, currencyCode));
  return currency ? currency.rateToSar : 1.0;
}

router.delete("/projections/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await db.delete(projectionsTable).where(eq(projectionsTable.id, params.data.id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Projection not found" });
    return;
  }
  res.status(204).send();
});

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

  const [employees, subs, salesResources, ctcRules, currencies] = await Promise.all([
    db.select().from(employeesTable).where(eq(employeesTable.projectionId, params.data.id)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, params.data.id)),
    db.select().from(salesSupportResourcesTable).where(eq(salesSupportResourcesTable.projectionId, params.data.id)),
    db.select().from(ctcRulesTable),
    db.select().from(currenciesTable),
  ]);

  const scenario = computeScenario({
    projection,
    employees,
    subscriptions: subs,
    salesResources,
    ctcRules,
    currencies,
  });

  res.json({ projection, ...scenario });
});

export default router;
export { getCtcMultiplier, getCurrencyRate };
