import { Router, type IRouter } from "express";
import {
  db,
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  quotationsTable,
  ctcRulesTable,
  currenciesTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { computeScenario } from "../lib/summary";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const projections = await db.select().from(projectionsTable).orderBy(desc(projectionsTable.createdAt));
  const allEmployees = await db.select().from(employeesTable);
  const allSubs = await db.select().from(subscriptionsTable);
  const allSalesResources = await db.select().from(salesSupportResourcesTable);
  const quotations = await db.select().from(quotationsTable).orderBy(desc(quotationsTable.createdAt));
  const ctcRules = await db.select().from(ctcRulesTable);
  const currencies = await db.select().from(currenciesTable);

  let recentProjection = null;
  if (projections.length > 0) {
    const p = projections[0];
    const employees = await db.select().from(employeesTable).where(eq(employeesTable.projectionId, p.id));
    const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, p.id));
    const salesResources = await db
      .select()
      .from(salesSupportResourcesTable)
      .where(eq(salesSupportResourcesTable.projectionId, p.id));

    const scenario = computeScenario({
      projection: p,
      employees,
      subscriptions: subs,
      salesResources,
      ctcRules,
      currencies,
    });

    recentProjection = {
      projection: p,
      ...scenario,
    };
  }

  res.json({
    recentProjection,
    totalProjections: projections.length,
    totalEmployees: allEmployees.length,
    totalSubscriptions: allSubs.length,
    totalSalesResources: allSalesResources.length,
    totalQuotations: quotations.length,
    recentQuotations: quotations.slice(0, 5),
  });
});

export default router;
