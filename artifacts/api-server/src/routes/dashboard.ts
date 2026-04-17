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

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const projections = await db.select().from(projectionsTable).orderBy(desc(projectionsTable.createdAt));
  const allEmployees = await db.select().from(employeesTable);
  const allSubs = await db.select().from(subscriptionsTable);
  const allSalesResources = await db.select().from(salesSupportResourcesTable);
  const quotations = await db.select().from(quotationsTable).orderBy(desc(quotationsTable.createdAt));
  const ctcRules = await db.select().from(ctcRulesTable);
  const currencies = await db.select().from(currenciesTable);

  let recentProjection = null;
  let costBreakdown: Array<{ category: string; amount: number }> = [];
  let headcountByCountry: Array<{ country: string; headcount: number; cost: number }> = [];
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

    costBreakdown = [
      { category: "Team", amount: Math.round(scenario.totalDeptCostMonthly) },
      { category: "Recurring Overheads", amount: Math.round(scenario.recurringOverheadMonthly) },
      {
        category: "One-time (amortized)",
        amount: Math.round(
          scenario.engagementMonths > 0 ? scenario.oneTimeCostsTotal / scenario.engagementMonths : 0,
        ),
      },
      {
        category: "Sales Support",
        amount: Math.round(
          scenario.engagementMonths > 0 ? scenario.salesSupportTotalCost / scenario.engagementMonths : 0,
        ),
      },
    ].filter((row) => row.amount > 0);

    const byCountry = new Map<string, { headcount: number; cost: number }>();
    for (const e of employees) {
      const rule = ctcRules.find(
        (r) =>
          r.isActive &&
          (r.countryCode.toLowerCase() === e.country.toLowerCase() ||
            r.countryName.toLowerCase() === e.country.toLowerCase()),
      );
      const m = rule ? rule.ctcMultiplier : 1;
      const alloc = (e.allocationPercent ?? 100) / 100;
      const monthly = e.salarySar * m * alloc;
      const cur = byCountry.get(e.country) ?? { headcount: 0, cost: 0 };
      cur.headcount += 1;
      cur.cost += monthly;
      byCountry.set(e.country, cur);
    }
    headcountByCountry = Array.from(byCountry.entries()).map(([country, v]) => ({
      country,
      headcount: v.headcount,
      cost: Math.round(v.cost),
    }));
  }

  const projectionTrend: Array<{
    label: string;
    monthlyCost: number;
    monthlyRevenue: number;
    marginPercent: number;
  }> = [];
  for (const p of [...projections].slice(0, 12).reverse()) {
    const employees = await db.select().from(employeesTable).where(eq(employeesTable.projectionId, p.id));
    const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, p.id));
    const salesResources = await db
      .select()
      .from(salesSupportResourcesTable)
      .where(eq(salesSupportResourcesTable.projectionId, p.id));
    const sc = computeScenario({
      projection: p,
      employees,
      subscriptions: subs,
      salesResources,
      ctcRules,
      currencies,
    });
    const revenue = sc.sellingPriceWithoutVat * (p.numClients ?? 0);
    const cost = sc.totalDeptCostMonthly + sc.totalOverheadMonthly;
    projectionTrend.push({
      label: p.name?.trim() ? p.name : `#${p.id} · ${p.yearLabel}`,
      monthlyCost: Math.round(cost),
      monthlyRevenue: Math.round(revenue),
      marginPercent: Math.round((p.marginPercent > 1 ? p.marginPercent : p.marginPercent * 100) * 10) / 10,
    });
  }

  const statusCounts = new Map<string, { count: number; total: number }>();
  for (const q of quotations) {
    const cur = statusCounts.get(q.status) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += q.total ?? 0;
    statusCounts.set(q.status, cur);
  }
  const quotationsByStatus = Array.from(statusCounts.entries()).map(([status, v]) => ({
    status,
    count: v.count,
    total: Math.round(v.total),
  }));

  res.json({
    recentProjection,
    totalProjections: projections.length,
    totalEmployees: allEmployees.length,
    totalSubscriptions: allSubs.length,
    totalSalesResources: allSalesResources.length,
    totalQuotations: quotations.length,
    recentQuotations: quotations.slice(0, 5),
    charts: {
      costBreakdown,
      headcountByCountry,
      projectionTrend,
      quotationsByStatus,
    },
  });
});

export default router;
