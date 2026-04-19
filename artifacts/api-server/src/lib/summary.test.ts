import { describe, it, expect } from "vitest";
import { computeScenario, normalizeMarginToFraction, type ScenarioInputs } from "./summary";

const ksaRule = {
  id: 1,
  countryCode: "KSA",
  countryName: "KSA",
  ctcMultiplier: 1.0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const baseProjection = {
  id: 1,
  name: "Test",
  yearLabel: "2026",
  sarRate: 3.75,
  numClients: 4,
  marginPercent: 0.30,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

function emp(overrides: Partial<any> = {}) {
  return {
    id: 1,
    projectionId: 1,
    name: "Atif",
    title: "Engineer",
    country: "KSA",
    salarySar: 5000,
    monthsFte: 12,
    allocationPercent: 100,
    costBasis: "shared",
    assignedClientCount: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function inputs(over: Partial<ScenarioInputs> = {}): ScenarioInputs {
  return {
    projection: baseProjection,
    employees: [],
    subscriptions: [],
    salesResources: [],
    ctcRules: [ksaRule],
    currencies: [],
    ...over,
  };
}

describe("normalizeMarginToFraction", () => {
  it("treats values <=1 as fractions", () => {
    expect(normalizeMarginToFraction(0.3)).toBe(0.3);
    expect(normalizeMarginToFraction(1)).toBe(1);
  });
  it("treats values >1 as percent", () => {
    expect(normalizeMarginToFraction(30)).toBe(0.3);
  });
  it("clamps non-finite or non-positive", () => {
    expect(normalizeMarginToFraction(NaN)).toBe(0);
    expect(normalizeMarginToFraction(-5)).toBe(0);
  });
});

describe("computeScenario - shared cost basis", () => {
  it("1 shared employee, 4 clients → per-client cost is divided by 4", () => {
    const r = computeScenario(inputs({ employees: [emp({ salarySar: 5000 })] }));
    expect(r.totalDeptCostMonthly).toBe(5000);
    expect(r.costPerClientMonthly).toBe(1250);
  });

  it("shared cost: changing client count rescales per-client only", () => {
    const r4 = computeScenario(inputs({ employees: [emp({ salarySar: 4000 })] }));
    const r2 = computeScenario(
      { ...inputs({ employees: [emp({ salarySar: 4000 })] }), projection: { ...baseProjection, numClients: 2 } },
    );
    expect(r4.totalDeptCostMonthly).toBe(r2.totalDeptCostMonthly);
    expect(r4.costPerClientMonthly).toBe(1000);
    expect(r2.costPerClientMonthly).toBe(2000);
  });
});

describe("computeScenario - per-client cost basis", () => {
  it("1 dedicated per-client employee, 4 clients → total cost is multiplied by 4", () => {
    const r = computeScenario(
      inputs({ employees: [emp({ salarySar: 3000, costBasis: "per_client" })] }),
    );
    expect(r.totalDeptCostMonthly).toBe(12000);
    expect(r.costPerClientMonthly).toBe(3000);
  });

  it("assignedClientCount overrides numClients for per-client rows", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ salarySar: 4000, costBasis: "per_client", assignedClientCount: 2 })],
      }),
    );
    expect(r.totalDeptCostMonthly).toBe(8000);
    expect(r.costPerClientMonthly).toBe(2000);
  });
});

describe("computeScenario - allocation %", () => {
  it("applies allocation % to cost", () => {
    const r = computeScenario(inputs({ employees: [emp({ salarySar: 10000, allocationPercent: 10 })] }));
    expect(r.totalDeptCostMonthly).toBe(1000);
  });
});

describe("computeScenario - mixed shared + dedicated", () => {
  it("sums both buckets and exposes the split", () => {
    const r = computeScenario(
      inputs({
        employees: [
          emp({ id: 1, salarySar: 5000, costBasis: "shared" }),
          emp({ id: 2, salarySar: 2000, costBasis: "per_client" }),
        ],
      }),
    );
    expect(r.sharedDeptMonthly).toBe(5000);
    expect(r.perClientDeptMonthly).toBe(8000);
    expect(r.totalDeptCostMonthly).toBe(13000);
    expect(r.costPerClientMonthly).toBe(3250);
  });
});

describe("computeScenario - overheads", () => {
  it("amortizes one-time overhead over engagementMonths", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ monthsFte: 6 })],
        subscriptions: [
          { id: 1, projectionId: 1, name: "Setup", currency: "SAR", originalPrice: 6000, isOneTime: true, createdAt: new Date() } as any,
        ],
      }),
    );
    expect(r.engagementMonths).toBe(12);
    expect(r.oneTimeAmortizedMonthly).toBe(500);
    expect(r.recurringOverheadMonthly).toBe(0);
  });

  it("recurring overhead converts to yearly via engagementMonths", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ monthsFte: 12 })],
        subscriptions: [
          { id: 1, projectionId: 1, name: "Saas", currency: "SAR", originalPrice: 100, isOneTime: false, createdAt: new Date() } as any,
        ],
      }),
    );
    expect(r.recurringOverheadMonthly).toBe(100);
    expect(r.totalOverheadYearly).toBe(1200);
  });
});

describe("computeScenario - pricing", () => {
  it("30% margin produces selling price = cost / 0.7", () => {
    const r = computeScenario(inputs({ employees: [emp({ salarySar: 5000 })] }));
    expect(r.sellingPriceWithoutVat).toBeCloseTo(1250 / 0.7, 4);
  });

  it("VAT is 15% on top of selling price", () => {
    const r = computeScenario(inputs({ employees: [emp({ salarySar: 5000 })] }));
    expect(r.sellingPriceWithVatMonthly).toBeCloseTo(r.sellingPriceWithoutVat * 1.15, 4);
  });
});

describe("computeScenario - guardrails", () => {
  it("zero clients does not divide by zero", () => {
    const r = computeScenario(
      { ...inputs({ employees: [emp()] }), projection: { ...baseProjection, numClients: 0 } },
    );
    expect(r.costPerClientMonthly).toBe(0);
    expect(r.sellingPriceWithoutVat).toBe(0);
  });

  it("single client receives 100% of cost", () => {
    const r = computeScenario(
      { ...inputs({ employees: [emp({ salarySar: 5000 })] }), projection: { ...baseProjection, numClients: 1 } },
    );
    expect(r.costPerClientMonthly).toBe(5000);
  });
});

describe("computeScenario - sales support inclusion toggle", () => {
  function ss(overrides: Partial<any> = {}) {
    return {
      id: 1,
      projectionId: 1,
      name: "",
      title: "PM",
      department: "",
      country: "KSA",
      salarySar: 6000,
      ctcSar: null,
      months: 12,
      marginPercent: 0.30,
      allocationPercent: 100,
      costBasis: "shared",
      assignedClientCount: null,
      includeInTotals: false,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it("excluded by default → does not affect per-client economics", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ salarySar: 5000 })],
        salesResources: [ss()],
      }),
    );
    expect(r.salesSupportTotalCost).toBe(72000);
    expect(r.salesSupportPerClientMonthlyAmortized).toBe(0);
    expect(r.totalMonthlyCostPerClient).toBeCloseTo(1250, 4);
  });

  it("included → folds amortized cost into per-client economics", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ salarySar: 5000 })],
        salesResources: [ss({ includeInTotals: true })],
      }),
    );
    // 6000/mo × 12 mo / 12 mo engagement / 4 clients = 1500
    expect(r.salesSupportPerClientMonthlyAmortized).toBe(1500);
    expect(r.totalMonthlyCostPerClient).toBeCloseTo(1250 + 1500, 4);
  });

  it("per-client sales support multiplies by assignedClientCount", () => {
    const r = computeScenario(
      inputs({
        employees: [],
        salesResources: [ss({ includeInTotals: true, costBasis: "per_client", assignedClientCount: 4 })],
      }),
    );
    // 6000 × 4 clients × 12 months = 288000 total; amortized over 12mo / 4 clients = 6000 per client
    expect(r.salesSupportTotalCost).toBe(288000);
    expect(r.salesSupportPerClientMonthlyAmortized).toBe(6000);
  });
});

describe("computeScenario - Projection 36 canonical regression", () => {
  // Inputs derived to reproduce the canonical Projection 36 targets:
  //   Invoice #1 per client (inc. VAT) = SAR 79,964.02
  //   Recurring invoice per client (inc. VAT) = SAR 30,077.02
  //   Year-1 per client (inc. VAT) = SAR 410,811.24
  //   Year-1 all 5 clients (inc. VAT) ≈ SAR 2,054,056.20 (≈ target 2,054,056.07 within rounding)
  const proj36 = {
    ...baseProjection,
    numClients: 5,
    marginPercent: 0.30,
    vatRate: 0.15,
    fiscalYear: "2026-27",
  } as any;

  // Single shared employee whose salary produces exactly:
  //   coreCostPerClientMonthly = 18307.752 → coreSellExVatMonthly = 26153.93 → inc-VAT = 30077.02
  const proj36emp = emp({ salarySar: 91538.76, costBasis: "shared", months: 12, allocationPercent: 100 });

  // Vendor setup fee that adds exactly SAR 49,887.00 (inc. VAT) to Invoice #1
  const vendorSetup = {
    id: 1,
    projectionId: 1,
    name: "Platform Licensing",
    vendorName: "Vendor A",
    currency: "SAR",
    amount: 30366.00,
    amortizeMonths: 12,
    marginPercent: 0.30,
    notes: null,
    createdAt: new Date(),
  } as any;

  it("recurring invoice inc-VAT matches SAR 30,077.02", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(r.invoiceRecurringIncVat).toBeCloseTo(30077.02, 0);
  });

  it("invoice #1 inc-VAT matches SAR 79,964.02", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(r.invoice1TotalIncVat).toBeCloseTo(79964.02, 0);
  });

  it("year-1 per client inc-VAT = invoice1 + 11 × recurring = SAR 410,811.24", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(r.year1TotalPerClient).toBeCloseTo(410811.24, 0);
  });

  it("year-1 all 5 clients ≈ SAR 2,054,056 (within SAR 1 of target)", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(Math.abs(r.year1TotalAllClients - 2054056.07)).toBeLessThan(1);
  });

  it("marginMonthlyAvg uses ex-VAT basis (positive, less than invoice recurring)", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(r.marginMonthlyAvg).toBeGreaterThan(0);
    expect(r.marginMonthlyAvg).toBeLessThan(r.invoiceRecurringIncVat);
    // At 30% margin: recurring ex-VAT margin = 26153.93 × 0.30 = 7846.18
    expect(r.marginMonthlyAvg).toBeGreaterThan(7000);
    expect(r.marginMonthlyAvg).toBeLessThan(12000);
  });

  it("year1TotalAllClients = year1TotalPerClient × numClients structural invariant", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    expect(r.year1TotalAllClients).toBeCloseTo(r.year1TotalPerClient * 5, 0);
  });

  it("dashboard cost-per-client KPI: coreCostPerClientYearly + msCostPerClientYearly + vendorSetupTotalCost + infraOneTimeCostPerClient", () => {
    const r = computeScenario(inputs({
      projection: proj36,
      employees: [proj36emp],
      vendorSetupFees: [vendorSetup],
    }));
    // vendorSetupTotalCost is per-client (billed per engagement, not split across clients)
    const dashboardCostPerClient =
      (r.coreCostPerClientYearly ?? 0) +
      (r.msCostPerClientYearly ?? 0) +
      r.vendorSetupTotalCost +
      r.infraOneTimeCostPerClient;
    // Core annual cost (18307.752 × 12) = 219693.02 + vendor setup cost 30366.00 = 250059.02
    expect(dashboardCostPerClient).toBeGreaterThan(0);
    expect(dashboardCostPerClient).toBeCloseTo(
      r.coreCostPerClientYearly + r.vendorSetupTotalCost,
      0
    );
  });
});

describe("computeScenario - chart data", () => {
  it("price waterfall sums to gross selling price (incl VAT) per client", () => {
    const r = computeScenario(inputs({ employees: [emp({ salarySar: 5000 })] }));
    const sum = r.priceWaterfall.reduce((a, b) => a + b.amount, 0);
    expect(sum).toBe(Math.round(r.sellingPriceWithVatMonthly));
  });

  it("revenueVsCostByMonth has one entry per engagement month", () => {
    const r = computeScenario(inputs({ employees: [emp({ monthsFte: 6 })] }));
    expect(r.revenueVsCostByMonth).toHaveLength(12);
    expect(r.revenueVsCostByMonth[0].month).toBe("M1");
  });

  it("one-time costs hit month 1 only", () => {
    const r = computeScenario(
      inputs({
        employees: [emp({ monthsFte: 3, salarySar: 1000 })],
        subscriptions: [
          { id: 1, projectionId: 1, name: "Setup", currency: "SAR", originalPrice: 3000, isOneTime: true, createdAt: new Date() } as any,
        ],
      }),
    );
    expect(r.revenueVsCostByMonth[0].cost).toBe(1000 + 3000);
    expect(r.revenueVsCostByMonth[1].cost).toBe(1000);
  });
});
