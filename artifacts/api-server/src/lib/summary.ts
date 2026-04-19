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

function r2(n: number): number {
  return Math.round(n * 100) / 100;
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
  const marginFraction = normalizeMarginToFraction(marginPercent);

  // ─── Team (Core Platform) ──────────────────────────────────────────────────
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

  // ─── Overhead (Recurring Subscriptions only) ───────────────────────────────
  // One-time subscriptions are NOT amortized into monthly; they are tracked separately.
  let recurringOverheadMonthly = extraMonthlyOverhead;
  let oneTimeCostsTotal = 0;
  for (const sub of subscriptions) {
    const sarAmount = sub.originalPrice * rateToSar(sub.currency, currencies);
    if (sub.isOneTime) oneTimeCostsTotal += sarAmount;
    else recurringOverheadMonthly += sarAmount;
  }
  // Engagement-weighted: annual = monthly × 12 (no engagementMonths amortization)
  const totalOverheadYearly = recurringOverheadMonthly * 12;
  const totalOverheadMonthly = recurringOverheadMonthly;
  // Legacy fields (kept for backward compat)
  const oneTimeAmortizedMonthly = engagementMonths > 0 ? oneTimeCostsTotal / engagementMonths : 0;

  const overheadPerClientMonthly = numClients > 0 ? totalOverheadMonthly / numClients : 0;
  const overheadPerClientYearly = numClients > 0 ? totalOverheadYearly / numClients : 0;

  // ─── Core Platform Stream ──────────────────────────────────────────────────
  // Core = Team + Recurring Overhead, charged per client per month at projectionMargin
  const coreCostMonthly = totalDeptCostMonthly + totalOverheadMonthly;
  const coreCostPerClientMonthly = numClients > 0 ? coreCostMonthly / numClients : 0;
  const coreCostPerClientYearly = coreCostPerClientMonthly * 12;
  const coreSellExVatMonthly = priceWithMargin(coreCostPerClientMonthly, marginFraction);
  const coreSellIncVatMonthly = coreSellExVatMonthly * (1 + vatFraction);

  // ─── Managed Services Stream ───────────────────────────────────────────────
  // Engagement-weighted monthly: (ctc × alloc × months) / 12 → monthly × 12 = annual
  let salesSupportTotalCost = 0;
  let salesSupportIncludedMonthly = 0;
  let msTotalEngagementWeightedMonthly = 0;
  for (const r of salesResources) {
    const m = ctcMultiplier(r.country, ctcRules);
    const allocFraction = (r.allocationPercent ?? 100) / 100;
    const cm = clientMultiplier(r.costBasis, r.assignedClientCount, numClients);
    // Use ctcSar if explicitly set, otherwise derive from salary × multiplier
    const effectiveCtcPerMonth = r.ctcSar != null
      ? r.ctcSar * allocFraction * cm
      : r.salarySar * m * allocFraction * cm;
    const totalAnnualCost = effectiveCtcPerMonth * (r.months ?? 12);
    const engagementWeightedMonthly = totalAnnualCost / 12;
    salesSupportTotalCost += totalAnnualCost;
    msTotalEngagementWeightedMonthly += engagementWeightedMonthly;
    if (r.includeInTotals) {
      salesSupportIncludedMonthly += engagementWeightedMonthly;
    }
  }
  const salesSupportMarginFraction = salesResources.length > 0
    ? normalizeMarginToFraction(salesResources[salesResources.length - 1].marginPercent)
    : marginFraction;
  const salesSupportSellingPrice = salesSupportMarginFraction < 1
    ? salesSupportTotalCost / (1 - salesSupportMarginFraction)
    : salesSupportTotalCost;
  const salesSupportPerClientMonthlyAmortized =
    numClients > 0 ? salesSupportIncludedMonthly / numClients : 0;

  // Per-client MS costs (engagement-weighted)
  const msCostPerClientMonthly = numClients > 0 ? msTotalEngagementWeightedMonthly / numClients : 0;
  const msCostPerClientYearly = msCostPerClientMonthly * 12;
  const msSellExVatMonthly = priceWithMargin(msCostPerClientMonthly, marginFraction);
  const msSellIncVatMonthly = msSellExVatMonthly * (1 + vatFraction);

  // Combined monthly recurring per client
  const combinedExVatMonthly = coreSellExVatMonthly + msSellExVatMonthly;
  const combinedIncVatMonthly = combinedExVatMonthly * (1 + vatFraction);

  // ─── One-Time Setup Fees (Vendor Setup) ────────────────────────────────────
  // Each client pays the full setup fees
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
  const vendorSetupMonthlyAmortized = 0;
  const vendorSetupSellingPriceMonthly = 0;
  const vendorSetupPerClientMonthly = 0;

  // ─── Infrastructure Stream ─────────────────────────────────────────────────
  // One-time infra → Invoice #1 only, NOT in monthly recurring
  // Recurring infra (monthly/annual) → included in monthly (treated as overhead-like)
  let infrastructureMonthlyCost = 0;
  let infrastructureSellingPriceMonthly = 0;
  let infraOneTimeTotalCost = 0;
  let infraOneTimeTotalSelling = 0;
  let infraOneTimeTotalWithVat = 0;
  const infrastructureLines: Array<{
    id: number;
    name: string;
    category: string;
    billingCycle: string;
    monthlyCostSar: number;
    monthlySellingSar: number;
    marginSarMonthly: number;
    isOneTime: boolean;
    oneTimeCostSar: number;
    oneTimeSellingSar: number;
    oneTimeWithVatSar: number;
  }> = [];
  for (const ic of infrastructureCosts) {
    const sar = ic.amount * rateToSar(ic.currency, currencies);
    const cm = clientMultiplier(ic.allocationBasis, ic.assignedClientCount, numClients);
    const isOneTime = ic.billingCycle === "one_time";
    if (isOneTime) {
      // One-time: billed per client (cm already handles allocation)
      const oneTimeCost = sar * cm;
      const oneTimeSelling = priceWithMargin(oneTimeCost, ic.marginPercent);
      const oneTimeVat = oneTimeSelling * vatFraction;
      const oneTimeWithVat = oneTimeSelling + oneTimeVat;
      infraOneTimeTotalCost += oneTimeCost;
      infraOneTimeTotalSelling += oneTimeSelling;
      infraOneTimeTotalWithVat += oneTimeWithVat;
      infrastructureLines.push({
        id: ic.id,
        name: ic.name,
        category: ic.category,
        billingCycle: ic.billingCycle,
        monthlyCostSar: 0,
        monthlySellingSar: 0,
        marginSarMonthly: 0,
        isOneTime: true,
        oneTimeCostSar: oneTimeCost,
        oneTimeSellingSar: oneTimeSelling,
        oneTimeWithVatSar: oneTimeWithVat,
      });
    } else {
      let monthlyBase = sar;
      if (ic.billingCycle === "annual") monthlyBase = sar / 12;
      const monthlyCost = monthlyBase * cm;
      const monthlySelling = priceWithMargin(monthlyCost, ic.marginPercent);
      infrastructureMonthlyCost += monthlyCost;
      infrastructureSellingPriceMonthly += monthlySelling;
      infrastructureLines.push({
        id: ic.id,
        name: ic.name,
        category: ic.category,
        billingCycle: ic.billingCycle,
        monthlyCostSar: monthlyCost,
        monthlySellingSar: monthlySelling,
        marginSarMonthly: monthlySelling - monthlyCost,
        isOneTime: false,
        oneTimeCostSar: 0,
        oneTimeSellingSar: 0,
        oneTimeWithVatSar: 0,
      });
    }
  }
  // Per-client one-time infra (shared costs divided by numClients already via cm)
  const infraOneTimeCostPerClient = numClients > 0 ? infraOneTimeTotalCost / numClients : 0;
  const infraOneTimeSellExVatPerClient = numClients > 0 ? infraOneTimeTotalSelling / numClients : 0;
  const infraOneTimeSellIncVatPerClient = numClients > 0 ? infraOneTimeTotalWithVat / numClients : 0;
  const infrastructurePerClientMonthly = numClients > 0 ? infrastructureMonthlyCost / numClients : 0;

  // ─── Invoice Totals ────────────────────────────────────────────────────────
  // Invoice #1: Vendor Setup (per client) + Infra One-Time (per client) + Core M1 + MS M1
  const invoice1TotalExVat = r2(vendorSetupTotalSelling + infraOneTimeSellExVatPerClient + coreSellExVatMonthly + msSellExVatMonthly);
  const invoice1TotalIncVat = r2(vendorSetupTotalWithVat + infraOneTimeSellIncVatPerClient + coreSellIncVatMonthly + msSellIncVatMonthly);

  // Invoices #2-12: Core + MS recurring only
  const invoiceRecurringExVat = r2(coreSellExVatMonthly + msSellExVatMonthly);
  const invoiceRecurringIncVat = r2(combinedIncVatMonthly);

  // Year-1 per client = Invoice #1 + 11 × recurring
  const year1TotalPerClient = r2(invoice1TotalIncVat + 11 * invoiceRecurringIncVat);
  const year1TotalAllClients = r2(year1TotalPerClient * numClients);

  // Average monthly margin across 12 invoices per client (ex-VAT basis — VAT is a pass-through)
  const invoice1CostPerClient = r2(vendorSetupTotalCost + infraOneTimeCostPerClient + coreCostPerClientMonthly + msCostPerClientMonthly);
  const recurringCostPerClient = r2(coreCostPerClientMonthly + msCostPerClientMonthly);
  const month1Margin = r2(invoice1TotalExVat - invoice1CostPerClient);
  const recurringMargin = r2(invoiceRecurringExVat - recurringCostPerClient);
  const marginMonthlyAvg = r2((month1Margin + 11 * recurringMargin) / 12);

  // ─── Legacy Per-Client Economics (backward compat) ─────────────────────────
  const totalMonthlyCostPerClient =
    costPerClientMonthly +
    overheadPerClientMonthly +
    salesSupportPerClientMonthlyAmortized +
    vendorSetupPerClientMonthly +
    infrastructurePerClientMonthly;
  const totalYearlyCostPerClient = totalMonthlyCostPerClient * engagementMonths;

  const sellingPriceWithoutVat =
    marginFraction < 1 ? totalMonthlyCostPerClient / (1 - marginFraction) : totalMonthlyCostPerClient;
  const sellingPriceWithoutVatYearly =
    marginFraction < 1 ? totalYearlyCostPerClient / (1 - marginFraction) : totalYearlyCostPerClient;
  const marginSarMonthly = sellingPriceWithoutVat - totalMonthlyCostPerClient;
  const marginSarYearly = sellingPriceWithoutVatYearly - totalYearlyCostPerClient;
  const sellingPriceWithVatMonthly = sellingPriceWithoutVat * (1 + vatFraction);
  const sellingPriceWithVatYearly = sellingPriceWithoutVatYearly * (1 + vatFraction);
  const vatMonthlyPerClient = sellingPriceWithVatMonthly - sellingPriceWithoutVat;

  // ─── Charts ────────────────────────────────────────────────────────────────
  const costAllocationBreakdown = [
    { basis: "Shared dept", amount: Math.round(sharedDeptMonthly) },
    { basis: "Per-client dept", amount: Math.round(perClientDeptMonthly) },
    { basis: "Recurring overhead", amount: Math.round(recurringOverheadMonthly) },
    { basis: "Managed services", amount: Math.round(msTotalEngagementWeightedMonthly) },
    { basis: "Infrastructure", amount: Math.round(infrastructureMonthlyCost) },
  ].filter((row) => row.amount > 0);

  const priceWaterfall = [
    { component: "Core cost / client", amount: Math.round(coreCostPerClientMonthly) },
    { component: "MS cost / client", amount: Math.round(msCostPerClientMonthly) },
    { component: "Margin (Core)", amount: Math.round(coreSellExVatMonthly - coreCostPerClientMonthly) },
    { component: "Margin (MS)", amount: Math.round(msSellExVatMonthly - msCostPerClientMonthly) },
    { component: `VAT (${Math.round(vatFraction * 100)}%)`, amount: Math.round((coreSellExVatMonthly + msSellExVatMonthly) * vatFraction) },
  ].filter((row) => row.amount > 0);

  const revenueVsCostByMonth: Array<{ month: string; cost: number; revenue: number }> = [];
  const monthlyRevenueAllClients = combinedExVatMonthly * numClients;
  const recurringMonthlyAllClients = coreCostMonthly + msTotalEngagementWeightedMonthly + infrastructureMonthlyCost;
  for (let i = 1; i <= engagementMonths; i += 1) {
    const cost = recurringMonthlyAllClients + (i === 1 ? (infraOneTimeTotalCost + vendorSetupTotalCost * numClients + oneTimeCostsTotal) : 0);
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
    infraOneTimeTotalCost,
    infraOneTimeTotalSelling,
    infraOneTimeTotalWithVat,
    infraOneTimeCostPerClient,
    infraOneTimeSellExVatPerClient,
    infraOneTimeSellIncVatPerClient,
    coreCostPerClientMonthly: r2(coreCostPerClientMonthly),
    coreCostPerClientYearly: r2(coreCostPerClientYearly),
    coreSellExVatMonthly: r2(coreSellExVatMonthly),
    coreSellIncVatMonthly: r2(coreSellIncVatMonthly),
    msCostPerClientMonthly: r2(msCostPerClientMonthly),
    msCostPerClientYearly: r2(msCostPerClientYearly),
    msSellExVatMonthly: r2(msSellExVatMonthly),
    msSellIncVatMonthly: r2(msSellIncVatMonthly),
    combinedExVatMonthly: r2(combinedExVatMonthly),
    combinedIncVatMonthly: r2(combinedIncVatMonthly),
    invoice1TotalExVat,
    invoice1TotalIncVat,
    invoiceRecurringExVat,
    invoiceRecurringIncVat,
    year1TotalPerClient,
    year1TotalAllClients,
    marginMonthlyAvg,
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
