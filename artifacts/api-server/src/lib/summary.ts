import type {
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  vendorSetupFeesTable,
  infrastructureCostsTable,
  ctcRulesTable,
  currenciesTable,
} from "@workspace/db";

type Projection = typeof projectionsTable.$inferSelect;
type Employee = typeof employeesTable.$inferSelect;
type Subscription = typeof subscriptionsTable.$inferSelect;
type SalesSupport = typeof salesSupportResourcesTable.$inferSelect;
type VendorSetupFee = typeof vendorSetupFeesTable.$inferSelect;
type InfrastructureCost = typeof infrastructureCostsTable.$inferSelect;
type CtcRule = typeof ctcRulesTable.$inferSelect;
type Currency = typeof currenciesTable.$inferSelect;

export type ScenarioInputs = {
  projection: Projection;
  employees: Employee[];
  subscriptions: Subscription[];
  salesResources: SalesSupport[];
  vendorSetupFees?: VendorSetupFee[];
  infrastructureCosts?: InfrastructureCost[];
  ctcRules: CtcRule[];
  currencies: Currency[];
};

export type ScenarioOverrides = {
  numClients?: number;
  marginPercent?: number;
  addMonthlyOverheadSar?: number;
  scaleEmployeeSalariesBy?: number;
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

function priceWithMargin(cost: number, marginRaw: number): number {
  const f = normalizeMarginToFraction(marginRaw);
  return f < 1 ? cost / (1 - f) : cost;
}

export function computeScenario(
  inputs: ScenarioInputs,
  overrides: ScenarioOverrides = {},
) {
  const {
    projection,
    employees,
    subscriptions,
    salesResources,
    vendorSetupFees = [],
    infrastructureCosts = [],
    ctcRules,
    currencies,
  } = inputs;

  const numClients = overrides.numClients ?? projection.numClients;
  const marginPercent = overrides.marginPercent ?? projection.marginPercent;
  const salaryScale = overrides.scaleEmployeeSalariesBy ?? 1;
  const extraMonthlyOverhead = overrides.addMonthlyOverheadSar ?? 0;
  const vatFraction = projection.vatRate && projection.vatRate > 0
    ? (projection.vatRate > 1 ? projection.vatRate / 100 : projection.vatRate)
    : 0.15;
  const durationYears = projection.durationYears && projection.durationYears > 0 ? projection.durationYears : 1;

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
  const engagementMonths = Math.max(maxEmployeeMonths, maxSalesSupportMonths, durationYears * 12, 12);

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

  // One-time setup fees: treated as a single up-front charge, NOT folded into monthly recurring.
  let vendorSetupTotalCost = 0;
  let vendorSetupTotalSelling = 0;
  let vendorSetupTotalWithVat = 0;
  const vendorSetupLines: Array<{
    id: number;
    name: string;
    vendorName: string;
    amountSar: number;
    sellingSar: number;
    marginSar: number;
    vatSar: number;
    totalWithVatSar: number;
  }> = [];
  for (const v of vendorSetupFees) {
    const amountSar = v.amount * rateToSar(v.currency, currencies);
    const sellingSar = priceWithMargin(amountSar, v.marginPercent);
    const vatSar = sellingSar * vatFraction;
    const totalWithVatSar = sellingSar + vatSar;
    vendorSetupTotalCost += amountSar;
    vendorSetupTotalSelling += sellingSar;
    vendorSetupTotalWithVat += totalWithVatSar;
    vendorSetupLines.push({
      id: v.id,
      name: v.name,
      vendorName: v.vendorName ?? "",
      amountSar,
      sellingSar,
      marginSar: sellingSar - amountSar,
      vatSar,
      totalWithVatSar,
    });
  }
  // Kept at 0 — one-time setup is no longer amortized into per-client monthly cost.
  const vendorSetupMonthlyAmortized = 0;
  const vendorSetupSellingPriceMonthly = 0;
  const vendorSetupPerClientMonthly = 0;

  // Infrastructure costs
  let infrastructureMonthlyCost = 0;
  let infrastructureSellingPriceMonthly = 0;
  const infrastructureLines: Array<{
    id: number;
    name: string;
    category: string;
    monthlyCostSar: number;
    monthlySellingSar: number;
    marginSarMonthly: number;
  }> = [];
  for (const ic of infrastructureCosts) {
    const sar = ic.amount * rateToSar(ic.currency, currencies);
    let monthlyBase = sar;
    if (ic.billingCycle === "annual") monthlyBase = sar / 12;
    else if (ic.billingCycle === "one_time") monthlyBase = engagementMonths > 0 ? sar / engagementMonths : 0;
    const cm = clientMultiplier(ic.allocationBasis, ic.assignedClientCount, numClients);
    const monthlyCost = monthlyBase * cm;
    const monthlySelling = priceWithMargin(monthlyCost, ic.marginPercent);
    infrastructureMonthlyCost += monthlyCost;
    infrastructureSellingPriceMonthly += monthlySelling;
    infrastructureLines.push({
      id: ic.id,
      name: ic.name,
      category: ic.category,
      monthlyCostSar: monthlyCost,
      monthlySellingSar: monthlySelling,
      marginSarMonthly: monthlySelling - monthlyCost,
    });
  }
  const infrastructurePerClientMonthly =
    numClients > 0 ? infrastructureMonthlyCost / numClients : 0;

  // Per-client economics include sales-support, vendor setup, and infra
  const totalMonthlyCostPerClient =
    costPerClientMonthly +
    overheadPerClientMonthly +
    salesSupportPerClientMonthlyAmortized +
    vendorSetupPerClientMonthly +
    infrastructurePerClientMonthly;
  const totalYearlyCostPerClient = totalMonthlyCostPerClient * engagementMonths;

  const marginFraction = normalizeMarginToFraction(marginPercent);
  const sellingPriceWithoutVat =
    marginFraction < 1 ? totalMonthlyCostPerClient / (1 - marginFraction) : totalMonthlyCostPerClient;
  const sellingPriceWithoutVatYearly =
    marginFraction < 1 ? totalYearlyCostPerClient / (1 - marginFraction) : totalYearlyCostPerClient;
  const marginSarMonthly = sellingPriceWithoutVat - totalMonthlyCostPerClient;
  const marginSarYearly = sellingPriceWithoutVatYearly - totalYearlyCostPerClient;
  const sellingPriceWithVatMonthly = sellingPriceWithoutVat * (1 + vatFraction);
  const sellingPriceWithVatYearly = sellingPriceWithoutVatYearly * (1 + vatFraction);
  const vatMonthlyPerClient = sellingPriceWithVatMonthly - sellingPriceWithoutVat;

  const costAllocationBreakdown = [
    { basis: "Shared dept", amount: Math.round(sharedDeptMonthly) },
    { basis: "Per-client dept", amount: Math.round(perClientDeptMonthly) },
    { basis: "Recurring overhead", amount: Math.round(recurringOverheadMonthly) },
    { basis: "One-time (amortized)", amount: Math.round(oneTimeAmortizedMonthly) },
    { basis: "Managed services", amount: Math.round(salesSupportIncludedMonthly) },
    { basis: "Infrastructure", amount: Math.round(infrastructureMonthlyCost) },
  ].filter((row) => row.amount > 0);

  const priceWaterfall = [
    { component: "Team cost", amount: Math.round(costPerClientMonthly) },
    { component: "Overhead share", amount: Math.round(overheadPerClientMonthly) },
    { component: "Managed services", amount: Math.round(salesSupportPerClientMonthlyAmortized) },
    { component: "Infrastructure", amount: Math.round(infrastructurePerClientMonthly) },
    { component: "Margin", amount: Math.round(marginSarMonthly) },
    { component: `VAT (${Math.round(vatFraction * 100)}%)`, amount: Math.round(vatMonthlyPerClient) },
  ].filter((row) => row.amount > 0);

  const revenueVsCostByMonth: Array<{ month: string; cost: number; revenue: number }> = [];
  const monthlyRevenueAllClients = sellingPriceWithoutVat * numClients;
  const recurringMonthlyAllClients =
    totalDeptCostMonthly +
    recurringOverheadMonthly +
    salesSupportIncludedMonthly +
    infrastructureMonthlyCost;
  for (let i = 1; i <= engagementMonths; i += 1) {
    const cost = recurringMonthlyAllClients + (i === 1 ? oneTimeCostsTotal + vendorSetupTotalCost : 0);
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
    durationYears,
    vatRate: vatFraction,
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
    vendorSetupTotalCost,
    vendorSetupTotalSelling,
    vendorSetupTotalWithVat,
    vendorSetupMonthlyAmortized,
    vendorSetupSellingPriceMonthly,
    vendorSetupPerClientMonthly,
    vendorSetupLines,
    oneTimeSetupTotal: vendorSetupTotalCost,
    oneTimeSetupSellingExclVat: vendorSetupTotalSelling,
    oneTimeSetupTotalWithVat: vendorSetupTotalWithVat,
    infrastructureMonthlyCost,
    infrastructureSellingPriceMonthly,
    infrastructurePerClientMonthly,
    infrastructureLines,
    employeeCount: allEmployees.length,
    subscriptionCount: subscriptions.length,
    salesSupportCount: salesResources.length,
    vendorSetupCount: vendorSetupFees.length,
    infrastructureCount: infrastructureCosts.length,
    costAllocationBreakdown,
    priceWaterfall,
    revenueVsCostByMonth,
  };
}
