import { Router, type IRouter } from "express";
import { db, projectionsTable, employeesTable, subscriptionsTable, salesSupportResourcesTable, quotationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const projections = await db.select().from(projectionsTable).orderBy(desc(projectionsTable.createdAt));
  const employees = await db.select().from(employeesTable);
  const subs = await db.select().from(subscriptionsTable);
  const salesResources = await db.select().from(salesSupportResourcesTable);
  const quotations = await db.select().from(quotationsTable).orderBy(desc(quotationsTable.createdAt));

  const activeProjection = projections.length > 0 ? projections[0] : null;
  const totalProjections = projections.length;
  const totalEmployees = employees.length;
  const totalQuotations = quotations.length;
  const recentQuotations = quotations.slice(0, 5);

  res.json({
    activeProjection,
    totalProjections,
    totalEmployees,
    totalSubscriptions: subs.length,
    totalSalesResources: salesResources.length,
    totalQuotations,
    recentQuotations,
  });
});

export default router;
