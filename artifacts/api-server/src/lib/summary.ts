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
    })),
    ...(overrides.addEmployees ?? []).map((e) => ({
      country: e.country,
      salarySar: e.salarySar,
      monthsFte: e.monthsFte ?? 12,
      allocationPercent: 100,
    })),
  ];

  let totalDeptCostYearly = 0;
  for (const emp of allEmployees) {
    const m = ctcMultiplier(emp.country, ctcRules);
    const allocFraction = (emp.allocationPercent ?? 100) / 100;
    totalDeptCostYearly += emp.salarySar * m * emp.monthsFte * allocFraction;
  }

  const costPerClientYearly = numClients > 0 ? totalDeptCostYearly / numClients : 0;
  const costPerClientMonthly = costPerClientYearly / 12;

  let recurringOverheadMonthly = extraMonthlyOverhead;
  let oneTimeCostsTotal = 0;
  for (const sub of subscriptions) {
    const sarAmount = sub.originalPrice * rateToSar(sub.currency, currencies);
    if (sub.isOneTime) oneTimeCostsTotal += sarAmount;
    else recurringOverheadMonthly += sarAmount;
  }
  const totalOverheadYearly = recurringOverheadMonthly * 12 + oneTimeCostsTotal;
  const totalOverheadMonthly = totalOverheadYearly / 12;

  const overheadPerClientMonthly = numClients > 0 ? totalOverheadMonthly / numClients : 0;
  const overheadPerClientYearly = overheadPerClientMonthly * 12;
  const totalMonthlyCostPerClient = costPerClientMonthly + overheadPerClientMonthly;
  const totalYearlyCostPerClient = totalMonthlyCostPerClient * 12;
  const marginFraction = normalizeMarginToFraction(marginPercent);
  const sellingPriceWithoutVat =
    marginFraction < 1 ? totalMonthlyCostPerClient / (1 - marginFraction) : totalMonthlyCostPerClient;
  const sellingPriceWithoutVatYearly = sellingPriceWithoutVat * 12;
  const marginSarMonthly = sellingPriceWithoutVat - totalMonthlyCostPerClient;
  const marginSarYearly = marginSarMonthly * 12;
  const sellingPriceWithVatMonthly = sellingPriceWithoutVat * 1.15;
  const sellingPriceWithVatYearly = sellingPriceWithVatMonthly * 12;

  let salesSupportTotalCost = 0;
  let salesSupportMarginFraction = 0.30;
  for (const r of salesResources) {
    const m = ctcMultiplier(r.country, ctcRules);
    const allocFraction = (r.allocationPercent ?? 100) / 100;
    salesSupportTotalCost += r.salarySar * m * r.months * allocFraction;
    salesSupportMarginFraction = normalizeMarginToFraction(r.marginPercent);
  }
  const salesSupportSellingPrice =
    salesSupportMarginFraction < 1
      ? salesSupportTotalCost / (1 - salesSupportMarginFraction)
      : salesSupportTotalCost;

  return {
    inputsApplied: {
      numClients,
      marginPercent,
      salaryScale,
      extraMonthlyOverhead,
      addedEmployees: overrides.addEmployees ?? [],
    },
    totalDeptCostYearly,
    costPerClientYearly,
    costPerClientMonthly,
    totalOverheadMonthly,
    totalOverheadYearly,
    totalMonthlyCostPerClient,
    overheadPerClientMonthly,
    overheadPerClientYearly,
    totalYearlyCostPerClient,
    oneTimeCostsTotal,
    recurringOverheadMonthly,
    sellingPriceWithoutVat,
    sellingPriceWithoutVatYearly,
    marginSarMonthly,
    marginSarYearly,
    sellingPriceWithVatMonthly,
    sellingPriceWithVatYearly,
    salesSupportTotalCost,
    salesSupportSellingPrice,
    employeeCount: allEmployees.length,
    subscriptionCount: subscriptions.length,
    salesSupportCount: salesResources.length,
  };
}
