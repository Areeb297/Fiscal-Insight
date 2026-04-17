import type {
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  ctcRulesTable,
  currenciesTable,
} from "@workspace/db";

type Projection = typeof projectionsTable.$inferSelect;
type Employee = typeof employeesTable.$inferSelect;
type Subscription = typeof subscriptionsTable.$inferSelect;
type SalesSupport = typeof salesSupportResourcesTable.$inferSelect;
type CtcRule = typeof ctcRulesTable.$inferSelect;
type Currency = typeof currenciesTable.$inferSelect;

export type ScenarioInputs = {
  projection: Projection;
  employees: Employee[];
  subscriptions: Subscription[];
  salesResources: SalesSupport[];
  ctcRules: CtcRule[];
  currencies: Currency[];
};

export type ScenarioOverrides = {
  numClients?: number;
  marginPercent?: number;
  /** Add an extra fixed monthly overhead in SAR */
  addMonthlyOverheadSar?: number;
  /** Multiply every employee salary by this factor (e.g. 1.10 for +10%) */
  scaleEmployeeSalariesBy?: number;
  /** Add hypothetical employees: monthly salary in SAR + country code */
  addEmployees?: Array<{ salarySar: number; country: string; monthsFte?: number }>;
};

export function normalizeMarginToFraction(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1 ? raw / 100 : raw;
}

function ctcMultiplier(country: string, ctcRules: CtcRule[]): number {
  const rule = ctcRules.find(
    (r) =>
      r.isActive &&
      (r.countryCode.toLowerCase() === country.toLowerCase() ||
        r.countryName.toLowerCase() === country.toLowerCase()),
  );
  return rule ? rule.ctcMultiplier : 1.0;
}

function rateToSar(currencyCode: string, currencies: Currency[]): number {
  if (currencyCode === "SAR") return 1.0;
  const c = currencies.find((cu) => cu.code === currencyCode);
  return c ? c.rateToSar : 1.0;
}

/**
 * Resolve the per-row cost-basis multiplier:
 *   - "shared"     → contributes 1× (cost is divided across all clients later)
 *   - "per_client" → contributes assignedClientCount× (defaults to numClients)
 */
function clientMultiplier(
  costBasis: string | null | undefined,
  assignedClientCount: number | null | undefined,
  numClients: number,
): number {
  if (costBasis === "per_client") {
    const n = assignedClientCount ?? numClients;
    return Math.max(0, n);
  }
  return 1;
}

export function computeScenario(
  inputs: ScenarioInputs,
  overrides: ScenarioOverrides = {},
) {
  const { projection, employees, subscriptions, salesResources, ctcRules, currencies } = inputs;

  const numClients = overrides.numClients ?? projection.numClients;
  const marginPercent = overrides.marginPercent ?? projection.marginPercent;
  const salaryScale = overrides.scaleEmployeeSalariesBy ?? 1;
  const extraMonthlyOverhead = overrides.addMonthlyOverheadSar ?? 0;

  const allEmployees = [
    ...employees.map((e) => ({
      country: e.country,
      salarySar: e.salarySar * salaryScale,
      monthsFte: e.monthsFte,
      allocationPercent: e.allocationPercent ?? 100,
      costBasis: e.costBasis ?? "shared",
      assignedClientCount: e.assignedClientCount ?? null,
    })),
    ...(overrides.addEmployees ?? []).map((e) => ({
      country: e.country,
      salarySar: e.salarySar,
      monthsFte: e.monthsFte ?? 12,
      allocationPercent: 100,
      costBasis: "shared" as const,
      assignedClientCount: null as number | null,
    })),
  ];

  let totalDeptCostMonthly = 0;
  let totalDeptCostYearly = 0;
  let sharedDeptMonthly = 0;
  let perClientDeptMonthly = 0;
  let maxEmployeeMonths = 0;
  for (const emp of allEmployees) {
    const m = ctcMultiplier(emp.country, ctcRules);
    const allocFraction = (emp.allocationPercent ?? 100) / 100;
    const cm = clientMultiplier(emp.costBasis, emp.assignedClientCount, numClients);
    const monthlyContribution = emp.salarySar * m * allocFraction * cm;
    totalDeptCostMonthly += monthlyContribution;
    totalDeptCostYearly += monthlyContribution * emp.monthsFte;
    if (emp.costBasis === "per_client") {
      perClientDeptMonthly += monthlyContribution;
    } else {
      sharedDeptMonthly += monthlyContribution;
    }
    if (emp.monthsFte > maxEmployeeMonths) maxEmployeeMonths = emp.monthsFte;
  }
  const maxSalesSupportMonths = salesResources.reduce((m, r) => Math.max(m, r.months ?? 0), 0);
  const engagementMonths = Math.max(maxEmployeeMonths, maxSalesSupportMonths, 12);

  const costPerClientMonthly = numClients > 0 ? totalDeptCostMonthly / numClients : 0;
  const costPerClientYearly = numClients > 0 ? totalDeptCostYearly / numClients : 0;

  let recurringOverheadMonthly = extraMonthlyOverhead;
  let oneTimeCostsTotal = 0;
  for (const sub of subscriptions) {
    const sarAmount = sub.originalPrice * rateToSar(sub.currency, currencies);
    if (sub.isOneTime) oneTimeCostsTotal += sarAmount;
    else recurringOverheadMonthly += sarAmount;
  }
  const oneTimeAmortizedMonthly = engagementMonths > 0 ? oneTimeCostsTotal / engagementMonths : 0;
  const totalOverheadMonthly = recurringOverheadMonthly + oneTimeAmortizedMonthly;
  const totalOverheadYearly = recurringOverheadMonthly * engagementMonths + oneTimeCostsTotal;

  const overheadPerClientMonthly = numClients > 0 ? totalOverheadMonthly / numClients : 0;
  const overheadPerClientYearly = numClients > 0 ? totalOverheadYearly / numClients : 0;

  // Sales support / managed services
  let salesSupportTotalCost = 0;
  let salesSupportIncludedMonthly = 0;
  let salesSupportMarginFraction = 0.30;
  for (const r of salesResources) {
    const m = ctcMultiplier(r.country, ctcRules);
    const allocFraction = (r.allocationPercent ?? 100) / 100;
    const cm = clientMultiplier(r.costBasis, r.assignedClientCount, numClients);
    const monthlyContribution = r.salarySar * m * allocFraction * cm;
    salesSupportTotalCost += monthlyContribution * r.months;
    if (r.includeInTotals) {
      // Amortize across the engagement so it appears as a monthly run-rate item
      const amortized = engagementMonths > 0 ? (monthlyContribution * r.months) / engagementMonths : 0;
      salesSupportIncludedMonthly += amortized;
    }
    salesSupportMarginFraction = normalizeMarginToFraction(r.marginPercent);
  }
  const salesSupportSellingPrice =
    salesSupportMarginFraction < 1
      ? salesSupportTotalCost / (1 - salesSupportMarginFraction)
      : salesSupportTotalCost;
  const salesSupportPerClientMonthlyAmortized =
    numClients > 0 ? salesSupportIncludedMonthly / numClients : 0;

  // Per-client economics now optionally include sales-support items
  const totalMonthlyCostPerClient =
    costPerClientMonthly + overheadPerClientMonthly + salesSupportPerClientMonthlyAmortized;
  const totalYearlyCostPerClient = totalMonthlyCostPerClient * engagementMonths;

  const marginFraction = normalizeMarginToFraction(marginPercent);
  const sellingPriceWithoutVat =
    marginFraction < 1 ? totalMonthlyCostPerClient / (1 - marginFraction) : totalMonthlyCostPerClient;
  const sellingPriceWithoutVatYearly =
    marginFraction < 1 ? totalYearlyCostPerClient / (1 - marginFraction) : totalYearlyCostPerClient;
  const marginSarMonthly = sellingPriceWithoutVat - totalMonthlyCostPerClient;
  const marginSarYearly = sellingPriceWithoutVatYearly - totalYearlyCostPerClient;
  const sellingPriceWithVatMonthly = sellingPriceWithoutVat * 1.15;
  const sellingPriceWithVatYearly = sellingPriceWithoutVatYearly * 1.15;
  const vatMonthlyPerClient = sellingPriceWithVatMonthly - sellingPriceWithoutVat;

  // Donut data: cost by allocation basis
  const costAllocationBreakdown = [
    { basis: "Shared dept", amount: Math.round(sharedDeptMonthly) },
    { basis: "Per-client dept", amount: Math.round(perClientDeptMonthly) },
    { basis: "Recurring overhead", amount: Math.round(recurringOverheadMonthly) },
    { basis: "One-time (amortized)", amount: Math.round(oneTimeAmortizedMonthly) },
    { basis: "Managed services", amount: Math.round(salesSupportIncludedMonthly) },
  ].filter((row) => row.amount > 0);

  // Horizontal bar: per-client price waterfall
  const priceWaterfall = [
    { component: "Team cost", amount: Math.round(costPerClientMonthly) },
    { component: "Overhead share", amount: Math.round(overheadPerClientMonthly) },
    { component: "Managed services", amount: Math.round(salesSupportPerClientMonthlyAmortized) },
    { component: "Margin", amount: Math.round(marginSarMonthly) },
    { component: "VAT (15%)", amount: Math.round(vatMonthlyPerClient) },
  ].filter((row) => row.amount > 0);

  // Area chart: revenue vs cost across engagement months (one-time hits month 1)
  const revenueVsCostByMonth: Array<{ month: string; cost: number; revenue: number }> = [];
  const monthlyRevenueAllClients = sellingPriceWithoutVat * numClients;
  const recurringMonthlyAllClients = totalDeptCostMonthly + recurringOverheadMonthly + salesSupportIncludedMonthly;
  for (let i = 1; i <= engagementMonths; i += 1) {
    const cost = recurringMonthlyAllClients + (i === 1 ? oneTimeCostsTotal : 0);
    revenueVsCostByMonth.push({
      month: `M${i}`,
      cost: Math.round(cost),
      revenue: Math.round(monthlyRevenueAllClients),
    });
  }

  return {
    inputsApplied: {
      numClients,
      marginPercent,
      salaryScale,
      extraMonthlyOverhead,
      addedEmployees: overrides.addEmployees ?? [],
    },
    totalDeptCostMonthly,
    totalDeptCostYearly,
    sharedDeptMonthly,
    perClientDeptMonthly,
    engagementMonths,
    costPerClientYearly,
    costPerClientMonthly,
    totalOverheadMonthly,
    totalOverheadYearly,
    totalMonthlyCostPerClient,
    overheadPerClientMonthly,
    overheadPerClientYearly,
    totalYearlyCostPerClient,
    oneTimeCostsTotal,
    oneTimeAmortizedMonthly,
    recurringOverheadMonthly,
    sellingPriceWithoutVat,
    sellingPriceWithoutVatYearly,
    marginSarMonthly,
    marginSarYearly,
    sellingPriceWithVatMonthly,
    sellingPriceWithVatYearly,
    vatMonthlyPerClient,
    salesSupportTotalCost,
    salesSupportSellingPrice,
    salesSupportIncludedMonthly,
    salesSupportPerClientMonthlyAmortized,
    employeeCount: allEmployees.length,
    subscriptionCount: subscriptions.length,
    salesSupportCount: salesResources.length,
    costAllocationBreakdown,
    priceWaterfall,
    revenueVsCostByMonth,
  };
}
