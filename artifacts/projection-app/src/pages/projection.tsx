import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useListProjections,
  getListProjectionsQueryKey,
  useGetProjection,
  getGetProjectionQueryKey,
  useCreateProjection,
  useUpdateProjection,
  useGetProjectionSummary,
  getGetProjectionSummaryQueryKey,
  getGetDashboardSummaryQueryKey,
  useListEmployees,
  getListEmployeesQueryKey,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useListSubscriptions,
  getListSubscriptionsQueryKey,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useListSalesSupportResources,
  getListSalesSupportResourcesQueryKey,
  useCreateSalesSupportResource,
  useUpdateSalesSupportResource,
  useDeleteSalesSupportResource,
  useListVendorSetupFees,
  getListVendorSetupFeesQueryKey,
  useCreateVendorSetupFee,
  useUpdateVendorSetupFee,
  useDeleteVendorSetupFee,
  useListInfrastructureCosts,
  getListInfrastructureCostsQueryKey,
  useCreateInfrastructureCost,
  useUpdateInfrastructureCost,
  useDeleteInfrastructureCost,
  useListCtcRules,
  getListCtcRulesQueryKey,
  useListCurrencies,
  getListCurrenciesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash, Calculator, ArrowLeft, Server, Building2,
  TrendingUp, Wallet, Receipt, Layers, ChevronDown,
  SlidersHorizontal, Users, CreditCard, Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const KNOWN_DEPTS = ["HC", "FIN", "OPS", "IT", "CS"] as const;

type SectionId = "team" | "overheads" | "sales" | "setup" | "infra" | "streams" | "invoice";

const NAV_GROUPS = [
  {
    label: "INPUTS",
    color: "text-blue-500 dark:text-blue-400",
    sections: [
      { id: "team" as SectionId, num: "§ 1.1", label: "Team", icon: Users },
      { id: "overheads" as SectionId, num: "§ 1.2", label: "Overheads", icon: CreditCard },
      { id: "sales" as SectionId, num: "§ 1.3", label: "Managed Services", icon: Activity },
      { id: "setup" as SectionId, num: "§ 1.4", label: "Setup Fees", icon: Building2 },
      { id: "infra" as SectionId, num: "§ 1.5", label: "Infrastructure", icon: Server },
    ],
  },
  {
    label: "ECONOMICS",
    color: "text-emerald-500 dark:text-emerald-400",
    sections: [
      { id: "streams" as SectionId, num: "§ 2.1", label: "Revenue Streams", icon: TrendingUp },
      { id: "invoice" as SectionId, num: "§ 2.2", label: "Invoice Schedule", icon: Receipt },
    ],
  },
];

const SECTION_COLORS: Record<SectionId, {
  border: string;
  num: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  accentBar: string;
}> = {
  team: {
    border:     "border-l-blue-500",
    num:        "text-blue-600 dark:text-blue-400",
    headerBg:   "bg-blue-50 dark:bg-blue-950/40",
    headerText: "text-blue-900 dark:text-blue-100",
    badgeBg:    "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    accentBar:  "bg-blue-500",
  },
  overheads: {
    border:     "border-l-slate-500",
    num:        "text-slate-600 dark:text-slate-400",
    headerBg:   "bg-slate-100 dark:bg-slate-900/60",
    headerText: "text-slate-900 dark:text-slate-100",
    badgeBg:    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    accentBar:  "bg-slate-500",
  },
  sales: {
    border:     "border-l-violet-500",
    num:        "text-violet-600 dark:text-violet-400",
    headerBg:   "bg-violet-50 dark:bg-violet-950/40",
    headerText: "text-violet-900 dark:text-violet-100",
    badgeBg:    "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
    accentBar:  "bg-violet-500",
  },
  setup: {
    border:     "border-l-amber-500",
    num:        "text-amber-600 dark:text-amber-400",
    headerBg:   "bg-amber-50 dark:bg-amber-950/40",
    headerText: "text-amber-900 dark:text-amber-100",
    badgeBg:    "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    accentBar:  "bg-amber-500",
  },
  infra: {
    border:     "border-l-sky-500",
    num:        "text-sky-600 dark:text-sky-400",
    headerBg:   "bg-sky-50 dark:bg-sky-950/40",
    headerText: "text-sky-900 dark:text-sky-100",
    badgeBg:    "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
    accentBar:  "bg-sky-500",
  },
  streams: {
    border:     "border-l-emerald-500",
    num:        "text-emerald-600 dark:text-emerald-400",
    headerBg:   "bg-emerald-50 dark:bg-emerald-950/40",
    headerText: "text-emerald-900 dark:text-emerald-100",
    badgeBg:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    accentBar:  "bg-emerald-500",
  },
  invoice: {
    border:     "border-l-indigo-500",
    num:        "text-indigo-600 dark:text-indigo-400",
    headerBg:   "bg-indigo-50 dark:bg-indigo-950/40",
    headerText: "text-indigo-900 dark:text-indigo-100",
    badgeBg:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
    accentBar:  "bg-indigo-500",
  },
};

/* ── Section Band ── */
function SectionBand({
  id, num, title, sectionId, isOpen, onToggle, action, count, total, children,
}: {
  id: string;
  num: string;
  title: string;
  sectionId: SectionId;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  count?: number;
  total?: string;
  children: React.ReactNode;
}) {
  const c = SECTION_COLORS[sectionId];
  return (
    <div id={id} className={cn("rounded-[14px] border border-[#e5eaf0] border-l-[3px] overflow-hidden", c.border)} style={{ boxShadow: "0 1px 0 rgba(16,24,40,0.03), 0 1px 2px rgba(16,24,40,0.04)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3.5 px-[18px] py-3.5 text-left bg-white hover:bg-[#fafbfd] transition-colors group min-h-[56px]"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 text-[#8aa0b2] transition-transform duration-180 shrink-0", isOpen && "rotate-180")} />
        <span className={cn("text-[11px] font-mono font-semibold tracking-[0.1em] shrink-0 opacity-60", c.num)}>{num}</span>
        <span className="text-[15px] font-semibold tracking-[-0.005em] text-[#0f2c3f]">{title}</span>
        {count !== undefined && (
          <span className="ml-1 h-5 min-w-[20px] px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums flex items-center justify-center bg-[#eef2f7] text-[#5a7184]">
            {count}
          </span>
        )}
        {total && (
          <span className="ml-2 text-[12.5px] text-[#5a7184] tabular-nums font-medium">
            {total}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
        </div>
      </button>
      {isOpen && <div className="border-t border-[#e5eaf0] bg-white">{children}</div>}
    </div>
  );
}

/* ── KPI Strip Item ── */
function KpiItem({
  label, value, unit, sub, color,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex flex-col justify-center gap-1 px-5 py-4 min-w-0 flex-1">
      <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground/55 truncate">{label}</span>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={cn("text-2xl font-bold tabular-nums leading-none tracking-tight", color)}>{value}</span>
        <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </div>
      <span className="text-[11px] text-muted-foreground/65 tabular-nums truncate leading-snug">{sub}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Projection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const [, setLocation] = useLocation();

  const [otherDepts, setOtherDepts] = useState<Set<number>>(new Set());
  const [showTweaks, setShowTweaks] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(["team", "overheads", "streams", "invoice"])
  );

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── Data ── */
  const routeId = params.id ? parseInt(params.id) : NaN;
  const hasRouteId = Number.isFinite(routeId) && routeId > 0;

  const { data: projections, isLoading: isLoadingProjections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });
  const { data: routeProjection, isLoading: isLoadingRouteProjection, isError: routeProjectionError } = useGetProjection(routeId, {
    query: { enabled: hasRouteId, queryKey: getGetProjectionQueryKey(routeId), retry: false },
  });

  const routeNotFound = hasRouteId && !isLoadingRouteProjection && (routeProjectionError || !routeProjection);
  const activeProjectionId = hasRouteId ? routeProjection?.id : projections?.[0]?.id;
  const activeProjection = hasRouteId ? routeProjection : projections?.[0];

  const { data: summary } = useGetProjectionSummary(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getGetProjectionSummaryQueryKey(activeProjectionId || 0) },
  });
  const { data: employees }          = useListEmployees(activeProjectionId || 0, { query: { enabled: !!activeProjectionId, queryKey: getListEmployeesQueryKey(activeProjectionId || 0) } });
  const { data: subscriptions }      = useListSubscriptions(activeProjectionId || 0, { query: { enabled: !!activeProjectionId, queryKey: getListSubscriptionsQueryKey(activeProjectionId || 0) } });
  const { data: salesSupport }       = useListSalesSupportResources(activeProjectionId || 0, { query: { enabled: !!activeProjectionId, queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId || 0) } });
  const { data: vendorSetupFees }    = useListVendorSetupFees(activeProjectionId || 0, { query: { enabled: !!activeProjectionId, queryKey: getListVendorSetupFeesQueryKey(activeProjectionId || 0) } });
  const { data: infrastructureCosts }= useListInfrastructureCosts(activeProjectionId || 0, { query: { enabled: !!activeProjectionId, queryKey: getListInfrastructureCostsQueryKey(activeProjectionId || 0) } });
  const { data: ctcRules }           = useListCtcRules({ query: { queryKey: getListCtcRulesQueryKey() } });
  const { data: currencies }         = useListCurrencies({ query: { queryKey: getListCurrenciesQueryKey() } });

  /* ── Mutations ── */
  const createProjection = useCreateProjection();
  const updateProjection = useUpdateProjection();
  const createEmployee   = useCreateEmployee();
  const updateEmployee   = useUpdateEmployee();
  const deleteEmployee   = useDeleteEmployee();
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();
  const createSalesSupport = useCreateSalesSupportResource();
  const updateSalesSupport = useUpdateSalesSupportResource();
  const deleteSalesSupport = useDeleteSalesSupportResource();
  const createVendor = useCreateVendorSetupFee();
  const updateVendor = useUpdateVendorSetupFee();
  const deleteVendor = useDeleteVendorSetupFee();
  const createInfra  = useCreateInfrastructureCost();
  const updateInfra  = useUpdateInfrastructureCost();
  const deleteInfra  = useDeleteInfrastructureCost();

  const invalidateAll = () => {
    if (!activeProjectionId) return;
    queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  /* ── Handlers ── */
  const handleUpdateProjectionSettings = (field: string, value: number | string | boolean) => {
    if (!activeProjectionId) return;
    updateProjection.mutate({ id: activeProjectionId, data: { [field]: value } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectionQueryKey(activeProjectionId) });
        queryClient.invalidateQueries({ queryKey: getListProjectionsQueryKey() });
      },
    });
  };

  const handleAddEmployee = () => {
    if (!activeProjectionId) return;
    createEmployee.mutate(
      { projectionId: activeProjectionId, data: { name: "New Employee", title: "Role", country: ctcRules?.[0]?.countryName || "KSA", salarySar: 0, monthsFte: 12, allocationPercent: 100 } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) }); invalidateAll(); } },
    );
  };
  const handleUpdateEmployee = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateEmployee.mutate({ projectionId: activeProjectionId, id, data: { [field]: value } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };
  const handleDeleteEmployee = (id: number) => {
    if (!activeProjectionId) return;
    deleteEmployee.mutate({ projectionId: activeProjectionId, id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };

  const handleAddSubscription = () => {
    if (!activeProjectionId) return;
    createSubscription.mutate(
      { projectionId: activeProjectionId, data: { name: "New Sub", currency: "SAR", originalPrice: 0, isOneTime: false } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) }); invalidateAll(); } },
    );
  };
  const handleUpdateSubscription = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateSubscription.mutate({ projectionId: activeProjectionId, id, data: { [field]: value } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };
  const handleDeleteSubscription = (id: number) => {
    if (!activeProjectionId) return;
    deleteSubscription.mutate({ projectionId: activeProjectionId, id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };

  const handleAddSalesSupport = () => {
    if (!activeProjectionId) return;
    createSalesSupport.mutate(
      { projectionId: activeProjectionId, data: { name: "Project Manager", title: "PM", department: "OPS", country: ctcRules?.[0]?.countryName || "KSA", salarySar: 20000, ctcSar: 30000, months: 12, marginPercent: 30, allocationPercent: 100 } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) }); invalidateAll(); } },
    );
  };
  const handleUpdateSalesSupport = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateSalesSupport.mutate({ projectionId: activeProjectionId, id, data: { [field]: value } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };
  const handleDeleteSalesSupport = (id: number) => {
    if (!activeProjectionId) return;
    deleteSalesSupport.mutate({ projectionId: activeProjectionId, id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };

  const handleAddVendor = () => {
    if (!activeProjectionId) return;
    createVendor.mutate(
      { projectionId: activeProjectionId, data: { name: "New Setup Item", vendorName: "", currency: "SAR", amount: 0, amortizeMonths: 1, marginPercent: 30 } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); } },
    );
  };
  const handleUpdateVendor = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateVendor.mutate({ projectionId: activeProjectionId, id, data: { [field]: value } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };
  const handleDeleteVendor = (id: number) => {
    if (!activeProjectionId) return;
    deleteVendor.mutate({ projectionId: activeProjectionId, id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };

  const handleAddInfra = () => {
    if (!activeProjectionId) return;
    createInfra.mutate(
      { projectionId: activeProjectionId, data: { name: "New Infrastructure Line", category: "compute", currency: "SAR", amount: 0, billingCycle: "one_time", marginPercent: 5, allocationBasis: "shared" } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); } },
    );
  };
  const handleUpdateInfra = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateInfra.mutate({ projectionId: activeProjectionId, id, data: { [field]: value } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };
  const handleDeleteInfra = (id: number) => {
    if (!activeProjectionId) return;
    deleteInfra.mutate({ projectionId: activeProjectionId, id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); },
    });
  };

  /* ── Helpers ── */
  const fmt = (val: number) => new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(val);
  const computeSellingPrice = (cost: number, marginRaw: number) => {
    if (!Number.isFinite(marginRaw) || marginRaw <= 0) return cost;
    const frac = marginRaw > 1 ? marginRaw / 100 : marginRaw;
    return frac < 1 ? cost / (1 - frac) : cost;
  };
  const normalizeMarginToFractionUI = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw > 1 ? raw / 100 : raw;
  };

  /* ── Loading / error states ── */
  if (isLoadingProjections || (hasRouteId && isLoadingRouteProjection)) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  if (routeNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Calculator className="h-14 w-14 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-xl font-bold mb-2">Projection Not Found</h2>
        <p className="text-muted-foreground mb-5 text-sm">This projection doesn't exist or has been deleted.</p>
        <Button onClick={() => setLocation("/projection")}>Back to Projections</Button>
      </div>
    );
  }
  if (!activeProjectionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Calculator className="h-14 w-14 text-muted-foreground mb-4 opacity-40" />
        <h2 className="text-xl font-bold mb-2">No Active Projection</h2>
        <p className="text-muted-foreground mb-5 text-sm">Create a projection to start modelling costs and margins.</p>
        <Button onClick={() => setLocation("/projection")}>Go to Projections</Button>
      </div>
    );
  }

  const headerName = activeProjection?.name?.trim() || `Projection ${activeProjection?.yearLabel ?? ""}`;
  const vat = activeProjection?.vatRate ?? 15;
  const nc  = activeProjection?.numClients || 1;

  /* ── Computed KPIs ── */
  const totalCostMonthly    = summary ? summary.totalDeptCostMonthly + summary.totalOverheadMonthly : 0;
  const totalCostEngagement = summary ? summary.totalDeptCostYearly  + summary.totalOverheadYearly  : 0;
  const months = summary?.engagementMonths ?? 12;
  const engUnit = months === 1 ? "mo" : `${months} mo`;
  const targetMarginPct = activeProjection?.marginPercent ?? 0;
  const actualMarginPct = summary && summary.sellingPriceWithoutVat > 0
    ? ((summary.sellingPriceWithoutVat - summary.totalMonthlyCostPerClient) / summary.sellingPriceWithoutVat) * 100
    : 0;
  const marginHealthy = actualMarginPct >= targetMarginPct;

  /* ── Pre-computed section totals ── */
  const fxToSarFn = (cur: string): number => {
    if (!cur || cur === "SAR") return 1;
    if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
    return currencies?.find((x: { code: string; rateToSar: number }) => x.code === cur)?.rateToSar ?? 1;
  };
  const msTotalCost = salesSupport?.reduce((s: number, r: { totalSalaryCost: number }) => s + r.totalSalaryCost, 0) ?? 0;
  const setupFeesTotalWithVat = (vendorSetupFees ?? []).reduce((acc: number, v: { amount?: number | null; currency?: string | null; marginPercent?: number | null }) => {
    const cost = (v.amount || 0) * fxToSarFn(v.currency || "SAR");
    const selling = computeSellingPrice(cost, v.marginPercent ?? 0);
    return acc + selling + selling * (vat / 100);
  }, 0);
  const infraMonthlyTotal = (infrastructureCosts ?? []).reduce((acc: number, line: { amount?: number | null; currency?: string | null; billingCycle?: string | null }) => {
    const sarAmount = (line.amount || 0) * fxToSarFn(line.currency || "SAR");
    const cycle = line.billingCycle || "one_time";
    if (cycle === "one_time") return acc;
    return acc + (cycle === "annual" ? sarAmount / 12 : sarAmount);
  }, 0);

  return (
    <div className="-mx-4 -mt-4 flex flex-col min-h-[calc(100vh-56px)]">
      {/* ── Compact Page Header ── */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2.5">
        <Link href="/projection">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Projection Workspace
            </span>
            {activeProjection?.fiscalYear && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">{activeProjection.fiscalYear}</Badge>
            )}
            {activeProjection?.startMonth && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">{activeProjection.startMonth}</Badge>
            )}
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">{headerName}</h1>
        </div>
        <div className="shrink-0">
          <Button
            variant={showTweaks ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-mono tracking-wide"
            onClick={() => setShowTweaks((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            TWEAKS
          </Button>
        </div>
      </div>

      {/* ── Sticky KPI Strip ── */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        {summary ? (
          <div className="flex divide-x divide-border/60 overflow-x-auto">
            <KpiItem
              label="Total Cost"
              value={fmt(totalCostMonthly)}
              unit="/ mo"
              sub={`${fmt(totalCostEngagement)} / ${engUnit}`}
              color="text-slate-700 dark:text-slate-200"
            />
            <KpiItem
              label="Cost / Client"
              value={fmt(summary.totalMonthlyCostPerClient)}
              unit="/ mo"
              sub={`${fmt(summary.totalYearlyCostPerClient)} / ${engUnit}`}
              color="text-violet-600 dark:text-violet-300"
            />
            <KpiItem
              label="Revenue · Monthly"
              value={fmt(summary.sellingPriceWithoutVat * nc)}
              unit="/ mo"
              sub={`${fmt(summary.sellingPriceWithoutVat)} × ${nc} clients`}
              color="text-emerald-600 dark:text-emerald-300"
            />
            <KpiItem
              label={`Revenue · ${engUnit}`}
              value={fmt(summary.sellingPriceWithoutVatYearly * nc)}
              unit={`/ ${engUnit}`}
              sub={`${fmt(summary.sellingPriceWithoutVatYearly)} × ${nc} clients`}
              color="text-indigo-600 dark:text-indigo-300"
            />
            <KpiItem
              label={`VAT (${vat}%)`}
              value={fmt((summary.sellingPriceWithVatYearly - summary.sellingPriceWithoutVatYearly) * nc)}
              unit={`/ ${engUnit}`}
              sub={`${fmt((summary.sellingPriceWithVatMonthly - summary.sellingPriceWithoutVat) * nc)} / mo`}
              color="text-amber-600 dark:text-amber-300"
            />
            <KpiItem
              label="Margin · Actual vs Target"
              value={`${actualMarginPct.toFixed(1)}%`}
              unit=""
              sub={`Target ${targetMarginPct.toFixed(0)}% · ${marginHealthy ? "on track ↑" : "below target ↓"}`}
              color={marginHealthy ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}
            />
          </div>
        ) : (
          <div className="h-[76px] flex items-center px-6">
            <Skeleton className="h-6 w-[500px]" />
          </div>
        )}
      </div>

      {/* ── TWEAKS Bar ── */}
      {showTweaks && (
        <div className="sticky top-[76px] z-10 px-5 py-3.5 bg-muted/50 border-b border-border/60 backdrop-blur-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Year Label</Label>
              <Input
                key={`yl-${activeProjection?.id}`}
                defaultValue={activeProjection?.yearLabel ?? ""}
                onBlur={(e) => handleUpdateProjectionSettings("yearLabel", e.target.value)}
                className="h-9 w-28 text-sm bg-background font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fiscal Year</Label>
              <Input
                key={`fy-${activeProjection?.id}`}
                defaultValue={activeProjection?.fiscalYear ?? activeProjection?.yearLabel ?? ""}
                onBlur={(e) => { const v = e.target.value.trim(); if (v) handleUpdateProjectionSettings("fiscalYear", v); }}
                className="h-9 w-32 text-sm bg-background tabular-nums font-medium"
                placeholder="2026-27"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Start Month</Label>
              {(() => {
                const raw = activeProjection?.startMonth ?? "";
                const parts = raw.match(/^(\d{4})-(\d{2})$/);
                const smYear = parts ? parts[1] : (activeProjection?.yearLabel?.match(/^\d{4}/) ? activeProjection.yearLabel.slice(0, 4) : String(new Date().getFullYear()));
                const smMonth = parts ? parts[2] : "";
                const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"] as const;
                const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                return (
                  <Select
                    key={`sm-${activeProjection?.id}`}
                    value={smMonth}
                    onValueChange={(m) => handleUpdateProjectionSettings("startMonth", `${smYear}-${m}`)}
                  >
                    <SelectTrigger className="h-9 w-36 text-sm bg-background font-medium">
                      <SelectValue placeholder="Month…" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={m}>{MONTH_NAMES[i]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration (yrs)</Label>
              <Input
                type="number" min="1" max="10" step="0.5"
                key={`dy-${activeProjection?.id}`}
                defaultValue={activeProjection?.durationYears ?? 1}
                onBlur={(e) => handleUpdateProjectionSettings("durationYears", parseFloat(e.target.value))}
                className="h-9 w-20 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">SAR / USD</Label>
              <Input
                type="number" step="0.01"
                key={`sar-${activeProjection?.id}`}
                defaultValue={activeProjection?.sarRate}
                onBlur={(e) => handleUpdateProjectionSettings("sarRate", parseFloat(e.target.value))}
                className="h-9 w-24 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clients</Label>
              <Input
                type="number" min="1"
                key={`nc-${activeProjection?.id}`}
                defaultValue={activeProjection?.numClients}
                onBlur={(e) => handleUpdateProjectionSettings("numClients", parseInt(e.target.value))}
                className="h-9 w-20 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Margin %</Label>
              <Input
                type="number" step="0.1"
                key={`mp-${activeProjection?.id}`}
                defaultValue={activeProjection?.marginPercent}
                onBlur={(e) => handleUpdateProjectionSettings("marginPercent", parseFloat(e.target.value))}
                className="h-9 w-24 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">VAT %</Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                key={`vat-${activeProjection?.id}`}
                defaultValue={activeProjection?.vatRate ?? 15}
                onBlur={(e) => handleUpdateProjectionSettings("vatRate", parseFloat(e.target.value))}
                className="h-9 w-20 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inv. Day</Label>
              <Input
                type="number" min="1" max="28"
                key={`idom-${activeProjection?.id}`}
                defaultValue={activeProjection?.invoiceDayOfMonth ?? 1}
                onBlur={(e) => handleUpdateProjectionSettings("invoiceDayOfMonth", parseInt(e.target.value))}
                className="h-9 w-18 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net Terms (d)</Label>
              <Input
                type="number" min="0" max="180"
                key={`pterms-${activeProjection?.id}`}
                defaultValue={activeProjection?.invoicePaymentTermsDays ?? 30}
                onBlur={(e) => handleUpdateProjectionSettings("invoicePaymentTermsDays", parseInt(e.target.value))}
                className="h-9 w-20 text-sm bg-background tabular-nums font-medium"
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="autoInv"
                checked={activeProjection?.autoGenerateInvoices ?? false}
                onCheckedChange={(v) => handleUpdateProjectionSettings("autoGenerateInvoices", Boolean(v))}
              />
              <Label htmlFor="autoInv" className="text-sm font-medium cursor-pointer">Auto-invoice</Label>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Area ── */}
      <div className="flex gap-0 mt-0 flex-1">

        {/* Left Nav Sidebar */}
        <aside className="hidden lg:flex w-52 shrink-0 sticky top-[76px] self-start flex-col border-r border-border/40 pt-4 pb-6 px-3 h-[calc(100vh-76px-56px)] overflow-y-auto">
          <div className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className={cn("text-[9px] font-black uppercase tracking-[0.22em] mb-2 px-2", group.color)}>
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.sections.map((sec) => {
                    const c = SECTION_COLORS[sec.id];
                    const isOpen = openSections.has(sec.id);
                    return (
                      <li key={sec.id}>
                        <button
                          onClick={() => {
                            if (!isOpen) toggleSection(sec.id);
                            document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors group border border-transparent",
                            isOpen
                              ? cn(c.headerBg, "border-border/30")
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className={cn("text-[10px] font-mono font-black w-9 shrink-0", c.num)}>
                            {sec.num}
                          </span>
                          <span className={cn(
                            "text-[11px] font-medium transition-colors truncate",
                            isOpen ? c.headerText : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {sec.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Sections */}
        <div className="flex-1 min-w-0 space-y-5 px-4 py-5 pb-20">

          {/* ── Cost Structure Summary (always-visible) ── */}
          {summary && (
            <div className="rounded-[14px] border border-[#e5eaf0] overflow-hidden" style={{ boxShadow: "0 1px 0 rgba(16,24,40,0.03), 0 1px 2px rgba(16,24,40,0.04)" }}>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-mono font-black tracking-widest text-slate-300 uppercase">Cost Structure</span>
                <span className="text-[10px] text-slate-400 ml-auto">Monthly · Engagement Total · Per Client / mo</span>
              </div>
              <table className="w-full text-[13px]">
                <thead><tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-border/50">
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">/ Month</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">/ {engUnit}</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">/ Client / Mo</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"/><span className="font-medium">Team · Dept Cost</span><span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono ml-1">§ 1.1</span></div></td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-300">{fmt(summary.totalDeptCostMonthly)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{fmt(summary.totalDeptCostYearly)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(summary.totalDeptCostMonthly / nc)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400 shrink-0"/><span className="font-medium">Overheads & Subscriptions</span><span className="text-[10px] text-slate-500 font-mono ml-1">§ 1.2</span></div></td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">{fmt(summary.totalOverheadMonthly)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{fmt(summary.totalOverheadYearly)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(summary.totalOverheadMonthly / nc)}</td>
                  </tr>
                  <tr className="bg-slate-100/60 dark:bg-slate-800/40">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-600 shrink-0"/><span className="font-bold text-slate-800 dark:text-slate-200">Grand Total · Core</span></div></td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">{fmt(totalCostMonthly)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-700 dark:text-slate-200">{fmt(totalCostEngagement)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-700 dark:text-slate-200">{fmt(summary.totalMonthlyCostPerClient)}</td>
                  </tr>
                  {msTotalCost > 0 && (
                    <tr className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shrink-0"/><span className="font-medium">Managed Services</span><span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono ml-1">§ 1.3</span></div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-violet-700 dark:text-violet-300">{fmt(msTotalCost / Math.max(months, 1))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-violet-600 dark:text-violet-400">{fmt(msTotalCost)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(msTotalCost / Math.max(months, 1) / nc)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Selling Prices Summary (always-visible) ── */}
          {summary && ((summary.coreSellExVatMonthly ?? 0) > 0 || (summary.msSellExVatMonthly ?? 0) > 0) && (
            <div className="rounded-[14px] border border-[#e5eaf0] overflow-hidden" style={{ boxShadow: "0 1px 0 rgba(16,24,40,0.03), 0 1px 2px rgba(16,24,40,0.04)" }}>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-800 dark:bg-emerald-900">
                <span className="text-[10px] font-mono font-black tracking-widest text-emerald-100 uppercase">Selling Prices</span>
                <span className="text-[10px] text-emerald-300 ml-1">· After {targetMarginPct.toFixed(0)}% Margin + {vat}% VAT</span>
                <span className="text-[10px] text-emerald-400 ml-auto">Ex-VAT · Inc-VAT per client / mo</span>
              </div>
              <table className="w-full text-[13px]">
                <thead><tr className="bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-border/50">
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Stream</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Sell ex-VAT</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Sell inc-VAT</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Frequency</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {(summary.coreSellExVatMonthly ?? 0) > 0 && (
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"/><span className="font-medium">Core Platform</span><span className="text-[10px] text-blue-500 font-mono ml-1">Team + Tools</span></div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-blue-700 dark:text-blue-300">{fmt(summary.coreSellExVatMonthly ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-blue-800 dark:text-blue-200">{fmt(summary.coreSellIncVatMonthly ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">/ mo · recurring</td>
                    </tr>
                  )}
                  {(summary.msSellExVatMonthly ?? 0) > 0 && (
                    <tr className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shrink-0"/><span className="font-medium">Managed Services</span><span className="text-[10px] text-violet-500 font-mono ml-1">PM + support</span></div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-violet-700 dark:text-violet-300">{fmt(summary.msSellExVatMonthly ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-violet-800 dark:text-violet-200">{fmt(summary.msSellIncVatMonthly ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">/ mo · recurring</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50/60 dark:bg-emerald-950/20">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0"/><span className="font-bold text-emerald-800 dark:text-emerald-200">Total Monthly (per client)</span></div></td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{fmt(summary.sellingPriceWithoutVat)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-800 dark:text-emerald-100">{fmt(summary.sellingPriceWithVatMonthly)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">/ mo · recurring</td>
                  </tr>
                  {setupFeesTotalWithVat > 0 && (
                    <tr className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"/><span className="font-medium">Setup Fees</span><span className="text-[10px] text-amber-600 font-mono ml-1">§ 1.4 · one-time</span></div></td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-300">{fmt(setupFeesTotalWithVat / (1 + vat / 100))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amber-800 dark:text-amber-200">{fmt(setupFeesTotalWithVat)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">one-time</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* §1.1 Team */}
          <SectionBand
            id="team"
            num="§ 1.1"
            title="Team · Department Cost"
            sectionId="team"
            isOpen={openSections.has("team")}
            onToggle={() => toggleSection("team")}
            count={employees?.length}
            total={summary ? `${fmt(summary.totalDeptCostYearly)} / yr` : undefined}
            action={
              <Button size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={handleAddEmployee}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f6f8fb]">
                    <TableHead className="w-[220px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3 whitespace-nowrap">Name</TableHead>
                    <TableHead className="w-[160px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Title</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Country</TableHead>
                    <TableHead className="w-[150px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Salary (SAR)</TableHead>
                    <TableHead className="w-[90px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Months</TableHead>
                    <TableHead className="w-[90px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Alloc %</TableHead>
                    <TableHead className="w-[160px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Basis</TableHead>
                    <TableHead className="w-[100px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">CTC</TableHead>
                    <TableHead className="w-[150px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Total / Yr</TableHead>
                    <TableHead className="w-[40px] border-b border-[#e5eaf0]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((emp) => (
                    <TableRow key={emp.id} className="group/row hover:bg-[#fafbfd]">
                      <TableCell className="p-2">
                        <Input defaultValue={emp.name} onBlur={(e) => handleUpdateEmployee(emp.id, "name", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input defaultValue={emp.title} onBlur={(e) => handleUpdateEmployee(emp.id, "title", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select defaultValue={emp.country} onValueChange={(val) => handleUpdateEmployee(emp.id, "country", val)}>
                          <SelectTrigger className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{ctcRules?.map(r => <SelectItem key={r.id} value={r.countryName}>{r.countryName}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" defaultValue={emp.salarySar} onBlur={(e) => handleUpdateEmployee(emp.id, "salarySar", parseFloat(e.target.value))} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-right tabular-nums text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" step="0.5" defaultValue={emp.monthsFte} onBlur={(e) => handleUpdateEmployee(emp.id, "monthsFte", parseFloat(e.target.value))} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-right tabular-nums text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" min="0" max="100" defaultValue={emp.allocationPercent ?? 100} onBlur={(e) => handleUpdateEmployee(emp.id, "allocationPercent", parseFloat(e.target.value))} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-right tabular-nums text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-1">
                          <Select value={emp.costBasis ?? "shared"} onValueChange={(val) => handleUpdateEmployee(emp.id, "costBasis", val)}>
                            <SelectTrigger className="h-9 border-transparent hover:border-input text-[12px] px-2 bg-transparent"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shared">Shared</SelectItem>
                              <SelectItem value="per_client">Per-client</SelectItem>
                            </SelectContent>
                          </Select>
                          {emp.costBasis === "per_client" && (
                            <Input type="number" min="0" defaultValue={emp.assignedClientCount ?? activeProjection?.numClients ?? 0} onBlur={(e) => handleUpdateEmployee(emp.id, "assignedClientCount", parseInt(e.target.value) || null)} className="h-9 w-14 border-transparent hover:border-input bg-transparent text-right text-[12px] tabular-nums" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[12px] p-2 tabular-nums text-muted-foreground">{emp.ctc}</TableCell>
                      <TableCell className="text-right font-semibold p-2 text-[13px] tabular-nums">
                        {fmt(emp.totalYearlyCost)}
                        {(emp.allocationPercent ?? 100) < 100 && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            100%: {fmt((emp.allocationPercent ?? 100) > 0 ? emp.totalYearlyCost / ((emp.allocationPercent ?? 100) / 100) : 0)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteEmployee(emp.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!employees?.length && (
                    <TableRow><TableCell colSpan={10} className="h-16 text-center text-sm text-muted-foreground">No team members. Click Add to get started.</TableCell></TableRow>
                  )}
                </TableBody>
                {summary && (
                  <TableFooter>
                    <TableRow className="bg-[#f8fafc]">
                      <TableCell colSpan={8} className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5a7184] py-[11px] px-3">Monthly total</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[13px] py-[11px] px-3 text-[#0f2c3f]">{fmt(summary.totalDeptCostMonthly)}</TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow className="bg-[#f8fafc]">
                      <TableCell colSpan={8} className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5a7184] py-[11px] px-3">Engagement total ({engUnit})</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[13px] py-[11px] px-3 text-[#0f2c3f]">{fmt(summary.totalDeptCostYearly)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </SectionBand>

          {/* §1.2 Overheads */}
          <SectionBand
            id="overheads"
            num="§ 1.2"
            title="Overheads & Subscriptions"
            sectionId="overheads"
            isOpen={openSections.has("overheads")}
            onToggle={() => toggleSection("overheads")}
            count={subscriptions?.length}
            total={summary ? `${fmt(summary.totalOverheadYearly)} / yr` : undefined}
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5" onClick={handleAddSubscription}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f6f8fb]">
                    <TableHead className="min-w-[260px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Name</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Type</TableHead>
                    <TableHead className="w-[110px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Currency</TableHead>
                    <TableHead className="w-[160px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Price (orig.)</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">SAR / mo</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">SAR / yr</TableHead>
                    <TableHead className="w-[40px] border-b border-[#e5eaf0]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id} className="group/row hover:bg-[#fafbfd]">
                      <TableCell className="p-2">
                        <Input defaultValue={sub.name} onBlur={(e) => handleUpdateSubscription(sub.id, "name", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-[13px]" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select value={sub.isOneTime ? "one-time" : "recurring"} onValueChange={(val) => handleUpdateSubscription(sub.id, "isOneTime", val === "one-time")}>
                          <SelectTrigger className="h-9 border-transparent hover:border-input bg-transparent text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recurring">Recurring</SelectItem>
                            <SelectItem value="one-time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select defaultValue={sub.currency} onValueChange={(val) => handleUpdateSubscription(sub.id, "currency", val)}>
                          <SelectTrigger className="h-9 border-transparent hover:border-input bg-transparent text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{currencies?.map(c => <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" defaultValue={sub.originalPrice} onBlur={(e) => handleUpdateSubscription(sub.id, "originalPrice", parseFloat(e.target.value))} className="h-9 border-transparent hover:border-input bg-transparent text-right tabular-nums text-[13px]" />
                      </TableCell>
                      <TableCell className="text-right font-semibold p-2 tabular-nums text-[13px]">{fmt(sub.monthlySar)}</TableCell>
                      <TableCell className="text-right font-semibold p-2 tabular-nums text-[13px]">{fmt(sub.yearlySar)}</TableCell>
                      <TableCell className="p-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteSubscription(sub.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!subscriptions?.length && (
                    <TableRow><TableCell colSpan={7} className="h-16 text-center text-[13px] text-muted-foreground">No overheads yet.</TableCell></TableRow>
                  )}
                </TableBody>
                {summary && (
                  <TableFooter>
                    <TableRow className="bg-[#f8fafc]">
                      <TableCell colSpan={4} className="text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5a7184] py-[11px] px-3">Total</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[13px] py-[11px] px-3 text-[#0f2c3f]">{fmt(summary.totalOverheadMonthly)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[13px] py-[11px] px-3 text-[#0f2c3f]">{fmt(summary.totalOverheadYearly)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </SectionBand>

          {/* §1.3 Sales Support / Managed Services */}
          <SectionBand
            id="sales"
            num="§ 1.3"
            title="Sales Support & Managed Services"
            sectionId="sales"
            isOpen={openSections.has("sales")}
            onToggle={() => toggleSection("sales")}
            count={salesSupport?.length}
            total={msTotalCost > 0 ? `${fmt(msTotalCost)} total` : undefined}
            action={
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1 px-2.5" onClick={handleAddSalesSupport}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table className="min-w-[2100px]">
                <TableHeader>
                  <TableRow className="bg-[#f6f8fb]">
                    <TableHead className="w-[170px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Name</TableHead>
                    <TableHead className="w-[160px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Title</TableHead>
                    <TableHead className="w-[130px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Dept</TableHead>
                    <TableHead className="w-[120px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Country</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Salary (SAR)</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">CTC / mo</TableHead>
                    <TableHead className="w-[100px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Months</TableHead>
                    <TableHead className="w-[100px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Alloc %</TableHead>
                    <TableHead className="w-[200px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Basis</TableHead>
                    <TableHead className="w-[80px] text-center text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">In Totals</TableHead>
                    <TableHead className="w-[100px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Margin %</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Total Cost</TableHead>
                    <TableHead className="w-[140px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Selling</TableHead>
                    <TableHead className="w-[40px] border-b border-[#e5eaf0]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesSupport?.map((res) => (
                    <TableRow key={res.id} className="group/row">
                      <TableCell className="p-1.5">
                        <Input defaultValue={res.name ?? ""} onBlur={(e) => handleUpdateSalesSupport(res.id, "name", e.target.value)} className="h-9" placeholder="Full name" />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input defaultValue={res.title} onBlur={(e) => handleUpdateSalesSupport(res.id, "title", e.target.value)} className="h-9" placeholder="Job title" />
                      </TableCell>
                      <TableCell className="p-1.5 min-w-[120px]">
                        {(() => {
                          const isKnown = (KNOWN_DEPTS as readonly string[]).includes(res.department ?? "");
                          const showOther = otherDepts.has(res.id) || (!isKnown && !!res.department);
                          return (
                            <div className="flex flex-col gap-1">
                              <Select value={showOther ? "Other" : (res.department ?? "")} onValueChange={(val) => {
                                if (val === "Other") { setOtherDepts((p) => new Set([...p, res.id])); }
                                else { setOtherDepts((p) => { const s = new Set(p); s.delete(res.id); return s; }); handleUpdateSalesSupport(res.id, "department", val); }
                              }}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Dept" /></SelectTrigger>
                                <SelectContent>
                                  {KNOWN_DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                  <SelectItem value="Other">Other…</SelectItem>
                                </SelectContent>
                              </Select>
                              {showOther && <Input defaultValue={isKnown ? "" : (res.department ?? "")} placeholder="Specify…" className="h-8" onBlur={(e) => { const v = e.target.value.trim(); if (v) handleUpdateSalesSupport(res.id, "department", v); }} />}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select defaultValue={res.country} onValueChange={(val) => handleUpdateSalesSupport(res.id, "country", val)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{ctcRules?.map(r => <SelectItem key={r.id} value={r.countryName}>{r.countryName}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5"><Input type="number" defaultValue={res.salarySar} onBlur={(e) => handleUpdateSalesSupport(res.id, "salarySar", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-1.5">
                        <Input key={`ctc-${res.id}-${res.ctcSar}`} type="number" defaultValue={res.ctcSar ?? res.ctc ?? ""} placeholder={String(Math.round(res.ctc ?? 0))} onBlur={(e) => { const v = e.target.value.trim(); handleUpdateSalesSupport(res.id, "ctcSar", v === "" ? null : parseFloat(v)); }} className="h-9 text-right tabular-nums" />
                      </TableCell>
                      <TableCell className="p-1.5"><Input type="number" step="0.5" defaultValue={res.months} onBlur={(e) => handleUpdateSalesSupport(res.id, "months", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-1.5"><Input type="number" min="0" max="100" defaultValue={res.allocationPercent ?? 100} onBlur={(e) => handleUpdateSalesSupport(res.id, "allocationPercent", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-1.5">
                        <div className="flex items-center gap-1">
                          <Select value={res.costBasis ?? "shared"} onValueChange={(val) => handleUpdateSalesSupport(res.id, "costBasis", val)}>
                            <SelectTrigger className="h-8 border-transparent hover:border-input text-xs px-2 bg-transparent"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shared">Shared</SelectItem>
                              <SelectItem value="per_client">Per-client</SelectItem>
                            </SelectContent>
                          </Select>
                          {res.costBasis === "per_client" && (
                            <Input type="number" min="0" defaultValue={res.assignedClientCount ?? activeProjection?.numClients ?? 0} onBlur={(e) => handleUpdateSalesSupport(res.id, "assignedClientCount", parseInt(e.target.value) || null)} className="h-9 w-20 border border-input bg-background text-right px-3 tabular-nums" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-1.5 text-center">
                        <Checkbox checked={!!res.includeInTotals} onCheckedChange={(v) => handleUpdateSalesSupport(res.id, "includeInTotals", v === true)} aria-label="Include in totals" />
                      </TableCell>
                      <TableCell className="p-1.5"><Input type="number" step="0.1" defaultValue={res.marginPercent} onBlur={(e) => handleUpdateSalesSupport(res.id, "marginPercent", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input bg-transparent text-right tabular-nums" /></TableCell>
                      <TableCell className="text-right font-medium p-1.5 text-muted-foreground tabular-nums text-sm">
                        {fmt(res.totalSalaryCost)}
                        {(res.allocationPercent ?? 100) < 100 && (
                          <div className="text-[9px] tabular-nums">100%: {fmt((res.allocationPercent ?? 100) > 0 ? res.totalSalaryCost / ((res.allocationPercent ?? 100) / 100) : 0)}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary p-1.5 tabular-nums text-sm">{fmt(computeSellingPrice(res.totalSalaryCost, res.marginPercent))}</TableCell>
                      <TableCell className="p-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteSalesSupport(res.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!salesSupport?.length && (
                    <TableRow><TableCell colSpan={14} className="h-16 text-center text-sm text-muted-foreground">No managed service resources added.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionBand>

          {/* §1.4 One-Time Setup Fees */}
          <SectionBand
            id="setup"
            num="§ 1.4"
            title="One-Time Setup Fees"
            sectionId="setup"
            isOpen={openSections.has("setup")}
            onToggle={() => toggleSection("setup")}
            count={vendorSetupFees?.length}
            total={setupFeesTotalWithVat > 0 ? `${fmt(setupFeesTotalWithVat)} inc-VAT` : undefined}
            action={
              <Button size="sm" className="h-7 text-xs gap-1 px-2.5" onClick={handleAddVendor}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            }
          >
            {(() => {
              const rows = (vendorSetupFees || []).map((v) => {
                const fxToSar = (cur: string) => {
                  if (!cur || cur === "SAR") return 1;
                  if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                  return currencies?.find(x => x.code === cur)?.rateToSar ?? 1;
                };
                const cost = (v.amount || 0) * fxToSar(v.currency || "SAR");
                const selling = computeSellingPrice(cost, v.marginPercent ?? 0);
                const marginSar = selling - cost;
                const vatAmt = selling * (vat / 100);
                const totalWithVat = selling + vatAmt;
                return { v, cost, marginSar, vatAmt, totalWithVat };
              });
              const totals = rows.reduce((acc, r) => ({ cost: acc.cost + r.cost, marginSar: acc.marginSar + r.marginSar, vatAmt: acc.vatAmt + r.vatAmt, totalWithVat: acc.totalWithVat + r.totalWithVat }), { cost: 0, marginSar: 0, vatAmt: 0, totalWithVat: 0 });
              return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f6f8fb]">
                        <TableHead className="w-8 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">#</TableHead>
                        <TableHead className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Item</TableHead>
                        <TableHead className="text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Vendor Cost (SAR)</TableHead>
                        <TableHead className="text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Margin %</TableHead>
                        <TableHead className="text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Margin (SAR)</TableHead>
                        <TableHead className="text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">VAT ({vat}%)</TableHead>
                        <TableHead className="text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Total w/ VAT</TableHead>
                        <TableHead className="w-[40px] border-b border-[#e5eaf0]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(({ v, cost, marginSar, vatAmt, totalWithVat }, idx) => (
                        <TableRow key={v.id} className="group/row">
                          <TableCell className="p-1.5 text-right text-muted-foreground tabular-nums text-xs">{idx + 1}</TableCell>
                          <TableCell className="p-1.5"><Input defaultValue={v.name} onBlur={(e) => handleUpdateVendor(v.id, "name", e.target.value)} className="h-8" placeholder="e.g. Implementation, License" /></TableCell>
                          <TableCell className="p-1.5"><Input type="number" step="0.01" defaultValue={cost} onBlur={(e) => handleUpdateVendor(v.id, "amount", parseFloat(e.target.value))} className="h-8 text-right tabular-nums" /></TableCell>
                          <TableCell className="p-1.5"><Input type="number" step="0.5" defaultValue={v.marginPercent} onBlur={(e) => handleUpdateVendor(v.id, "marginPercent", parseFloat(e.target.value))} className="h-8 text-right tabular-nums" /></TableCell>
                          <TableCell className="p-1.5 text-right font-mono text-sm tabular-nums">{fmt(marginSar)}</TableCell>
                          <TableCell className="p-1.5 text-right text-muted-foreground tabular-nums text-sm">{fmt(vatAmt)}</TableCell>
                          <TableCell className="p-1.5 text-right font-bold text-primary tabular-nums">{fmt(totalWithVat)}</TableCell>
                          <TableCell className="p-1.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteVendor(v.id)}><Trash className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!rows.length && (
                        <TableRow><TableCell colSpan={8} className="h-14 text-center text-sm text-muted-foreground">No setup fees yet.</TableCell></TableRow>
                      )}
                      {rows.length > 0 && (
                        <TableRow className="bg-[#f8fafc]">
                          <TableCell /><TableCell className="py-[11px] px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5a7184]">Total</TableCell>
                          <TableCell className="py-[11px] px-3 text-right tabular-nums font-semibold text-[13px] text-[#0f2c3f]">{fmt(totals.cost)}</TableCell>
                          <TableCell />
                          <TableCell className="py-[11px] px-3 text-right tabular-nums font-semibold text-[13px] text-[#10B981]">{fmt(totals.marginSar)}</TableCell>
                          <TableCell className="py-[11px] px-3 text-right tabular-nums font-semibold text-[13px] text-[#5a7184]">{fmt(totals.vatAmt)}</TableCell>
                          <TableCell className="py-[11px] px-3 text-right tabular-nums font-semibold text-[13px] text-[#0f2c3f]">{fmt(totals.totalWithVat)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </SectionBand>

          {/* §1.5 Infrastructure */}
          <SectionBand
            id="infra"
            num="§ 1.5"
            title="Infrastructure Costs"
            sectionId="infra"
            isOpen={openSections.has("infra")}
            onToggle={() => toggleSection("infra")}
            count={infrastructureCosts?.length}
            total={infraMonthlyTotal > 0 ? `${fmt(infraMonthlyTotal)} / mo` : undefined}
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5" onClick={handleAddInfra}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f6f8fb]">
                    <TableHead className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Name</TableHead>
                    <TableHead className="w-[110px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Category</TableHead>
                    <TableHead className="w-[90px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Currency</TableHead>
                    <TableHead className="w-[110px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Amount</TableHead>
                    <TableHead className="w-[110px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Billing</TableHead>
                    <TableHead className="w-[110px] text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Allocation</TableHead>
                    <TableHead className="w-[90px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Margin %</TableHead>
                    <TableHead className="w-[130px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Cost (SAR)</TableHead>
                    <TableHead className="w-[130px] text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[#5a7184] border-b border-[#e5eaf0] py-[9px] px-3">Selling</TableHead>
                    <TableHead className="w-[40px] border-b border-[#e5eaf0]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {infrastructureCosts?.map((line) => {
                    const fxToSar = (cur: string) => {
                      if (cur === "SAR") return 1;
                      if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                      return currencies?.find(x => x.code === cur)?.rateToSar ?? 1;
                    };
                    const sarAmount = (line.amount || 0) * fxToSar(line.currency || "SAR");
                    const cycle = line.billingCycle || "one_time";
                    const isOneTime = cycle === "one_time";
                    const displayCost = isOneTime ? sarAmount : cycle === "annual" ? sarAmount / 12 : sarAmount;
                    const sellingDisplay = computeSellingPrice(displayCost, line.marginPercent ?? 0);
                    return (
                      <TableRow key={line.id} className={cn("group/row hover:bg-[#fafbfd]", isOneTime && "bg-amber-50/20")}>
                        <TableCell className="p-1.5">
                          <div className="flex items-center gap-1.5">
                            <Input defaultValue={line.name} onBlur={(e) => handleUpdateInfra(line.id, "name", e.target.value)} className="h-8" />
                            {isOneTime && <span className="text-[8px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded shrink-0">Setup</span>}
                          </div>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Select value={line.category || "compute"} onValueChange={(val) => handleUpdateInfra(line.id, "category", val)}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compute">Compute</SelectItem>
                              <SelectItem value="storage">Storage</SelectItem>
                              <SelectItem value="network">Network</SelectItem>
                              <SelectItem value="saas">SaaS</SelectItem>
                              <SelectItem value="security">Security</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Select value={line.currency || "SAR"} onValueChange={(val) => handleUpdateInfra(line.id, "currency", val)}>
                            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>{(currencies && currencies.length > 0 ? currencies.map(c => c.code) : ["SAR", "USD"]).map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5"><Input type="number" step="0.01" defaultValue={line.amount} onBlur={(e) => handleUpdateInfra(line.id, "amount", parseFloat(e.target.value))} className="h-8 text-right tabular-nums" /></TableCell>
                        <TableCell className="p-1.5">
                          <Select value={cycle} onValueChange={(val) => handleUpdateInfra(line.id, "billingCycle", val)}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                              <SelectItem value="one_time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Select value={line.allocationBasis || "shared"} onValueChange={(val) => handleUpdateInfra(line.id, "allocationBasis", val)}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shared">Shared</SelectItem>
                              <SelectItem value="per_client">Per-client</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5"><Input type="number" step="0.5" defaultValue={line.marginPercent} onBlur={(e) => handleUpdateInfra(line.id, "marginPercent", parseFloat(e.target.value))} className="h-8 text-right tabular-nums" /></TableCell>
                        <TableCell className="p-1.5 text-right font-mono text-sm text-muted-foreground tabular-nums">
                          {fmt(displayCost)}
                          <div className="text-[9px] text-muted-foreground">{isOneTime ? "one-time" : cycle === "annual" ? "/ mo (ann.)" : "/ mo"}</div>
                        </TableCell>
                        <TableCell className="p-1.5 text-right font-bold text-primary tabular-nums">
                          {fmt(sellingDisplay)}
                          <div className="text-[9px] text-muted-foreground">{isOneTime ? "one-time" : "/ mo"}</div>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive transition-opacity" onClick={() => handleDeleteInfra(line.id)}><Trash className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!infrastructureCosts?.length && (
                    <TableRow><TableCell colSpan={10} className="h-14 text-center text-sm text-muted-foreground">No infrastructure lines yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionBand>

          {/* §2.1 Revenue Streams */}
          {summary && (summary.coreSellExVatMonthly != null || summary.msSellExVatMonthly != null) && (
            <SectionBand
              id="streams"
              num="§ 2.1"
              title="Revenue Streams · Per-Client Economics"
              sectionId="streams"
              isOpen={openSections.has("streams")}
              onToggle={() => toggleSection("streams")}
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  {
                    tone: "blue", icon: Layers, label: "Core Platform", sub: "Team + Tools · recurring",
                    rows: [
                      { label: "Cost / client / mo", value: fmt(summary.coreCostPerClientMonthly ?? 0) },
                      { label: "Sell ex-VAT / mo", value: fmt(summary.coreSellExVatMonthly ?? 0) },
                      { label: `Sell inc-VAT (${vat}%) / mo`, value: fmt(summary.coreSellIncVatMonthly ?? 0) },
                      { label: "Yearly per client", value: fmt((summary.coreSellIncVatMonthly ?? 0) * 12) },
                    ],
                  },
                  {
                    tone: "violet", icon: Building2, label: "Managed Services", sub: "PM + support · engagement-weighted",
                    rows: [
                      { label: "Cost / client / mo", value: fmt(summary.msCostPerClientMonthly ?? 0) },
                      { label: "Sell ex-VAT / mo", value: fmt(summary.msSellExVatMonthly ?? 0) },
                      { label: `Sell inc-VAT (${vat}%) / mo`, value: fmt(summary.msSellIncVatMonthly ?? 0) },
                      { label: "Yearly per client", value: fmt((summary.msSellIncVatMonthly ?? 0) * 12) },
                    ],
                  },
                  {
                    tone: "amber", icon: Receipt, label: "One-Time Setup", sub: "Vendor fees · billed once",
                    rows: [
                      { label: "Cost per client", value: fmt((summary.vendorSetupTotalCost ?? 0) + (summary.infraOneTimeCostPerClient ?? 0)) },
                      { label: "Sell ex-VAT", value: fmt((summary.vendorSetupTotalSelling ?? 0) + (summary.infraOneTimeSellExVatPerClient ?? 0)) },
                      { label: `Sell inc-VAT (${vat}%)`, value: fmt((summary.vendorSetupTotalWithVat ?? 0) + (summary.infraOneTimeSellIncVatPerClient ?? 0)) },
                      { label: `Total (${nc} clients)`, value: fmt(((summary.vendorSetupTotalWithVat ?? 0) + (summary.infraOneTimeSellIncVatPerClient ?? 0)) * nc) },
                    ],
                  },
                  {
                    tone: "emerald", icon: TrendingUp, label: "Invoice Summary", sub: "Per client · 12-month engagement",
                    rows: [
                      { label: "Invoice #1 (inc-VAT)", value: fmt(summary.invoice1TotalIncVat ?? 0) },
                      { label: "Invoices #2-12 each", value: fmt(summary.invoiceRecurringIncVat ?? 0) },
                      { label: "Year-1 per client", value: fmt(summary.year1TotalPerClient ?? 0) },
                      { label: `Year-1 × ${nc} clients`, value: fmt(summary.year1TotalAllClients ?? 0) },
                    ],
                  },
                ].map((stream) => {
                  const toneMap: Record<string, { ring: string; text: string; gradient: string; iconBg: string; label: string }> = {
                    blue:    { ring: "ring-blue-200/60 dark:ring-blue-700/40",    text: "text-blue-700 dark:text-blue-300",    gradient: "from-blue-50/70 via-background to-background dark:from-blue-900/20",    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300",    label: "text-blue-600 dark:text-blue-400" },
                    violet:  { ring: "ring-violet-200/60 dark:ring-violet-700/40", text: "text-violet-700 dark:text-violet-300", gradient: "from-violet-50/70 via-background to-background dark:from-violet-900/20", iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300", label: "text-violet-600 dark:text-violet-400" },
                    amber:   { ring: "ring-amber-200/60 dark:ring-amber-700/40",   text: "text-amber-700 dark:text-amber-300",   gradient: "from-amber-50/70 via-background to-background dark:from-amber-900/20",   iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300",   label: "text-amber-600 dark:text-amber-400" },
                    emerald: { ring: "ring-emerald-200/60 dark:ring-emerald-700/40", text: "text-emerald-700 dark:text-emerald-300", gradient: "from-emerald-50/70 via-background to-background dark:from-emerald-900/20", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", label: "text-emerald-600 dark:text-emerald-400" },
                  };
                  const t = toneMap[stream.tone];
                  const Icon = stream.icon;
                  return (
                    <Card key={stream.label} className={cn("ring-1 bg-gradient-to-br shadow-sm h-full", t.ring, t.gradient)}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", t.iconBg)}><Icon className="h-3 w-3" /></div>
                          <div>
                            <div className={cn("text-[10px] font-bold uppercase tracking-wide", t.label)}>{stream.label}</div>
                            <div className="text-[9px] text-muted-foreground">{stream.sub}</div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {stream.rows.map((row) => (
                            <div key={row.label} className="flex items-baseline justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground leading-snug shrink-0">{row.label}</span>
                              <span className={cn("text-xs font-bold tabular-nums shrink-0", t.text)}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </SectionBand>
          )}

          {/* §2.2 Invoice Schedule */}
          {summary && (
            <SectionBand
              id="invoice"
              num="§ 2.2"
              title="Invoice Schedule · Per Client"
              sectionId="invoice"
              isOpen={openSections.has("invoice")}
              onToggle={() => toggleSection("invoice")}
            >
              {(() => {
                const vatMult = 1 + (vat / 100);
                // Build Invoice #1 line items from existing data
                const setupLines = (vendorSetupFees || []).map((v, i) => {
                  const fxToSar = (cur: string) => {
                    if (!cur || cur === "SAR") return 1;
                    if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                    return 1;
                  };
                  const cost = (v.amount || 0) * fxToSar(v.currency || "SAR");
                  const marginFrac = (v.marginPercent ?? 0) > 1 ? (v.marginPercent ?? 0) / 100 : (v.marginPercent ?? 0);
                  const sellEx = marginFrac < 1 && marginFrac > 0 ? cost / (1 - marginFrac) : cost;
                  const sellInc = sellEx * vatMult;
                  const profit = sellEx - cost;
                  return { idx: i + 1, name: v.name || "Setup Item", type: "One-Time", cost, sellEx, sellInc, profit, margin: marginFrac * 100 };
                });
                const infraOneTimeLines = (infrastructureCosts || [])
                  .filter(l => l.billingCycle === "one_time")
                  .map((l, i) => {
                    const fxToSar = (cur: string) => {
                      if (!cur || cur === "SAR") return 1;
                      if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                      return 1;
                    };
                    const cost = (l.amount || 0) * fxToSar(l.currency || "SAR");
                    const marginFrac = (l.marginPercent ?? 0) > 1 ? (l.marginPercent ?? 0) / 100 : (l.marginPercent ?? 0);
                    const sellEx = marginFrac < 1 && marginFrac > 0 ? cost / (1 - marginFrac) : cost;
                    const sellInc = sellEx * vatMult;
                    const profit = sellEx - cost;
                    return { idx: setupLines.length + i + 1, name: l.name || "Infrastructure", type: "One-Time Hardware", cost, sellEx, sellInc, profit, margin: marginFrac * 100 };
                  });
                const coreCostM = summary.coreCostPerClientMonthly ?? 0;
                const coreSellEx = summary.coreSellExVatMonthly ?? 0;
                const coreSellInc = summary.coreSellIncVatMonthly ?? 0;
                const coreProfit = coreSellEx - coreCostM;
                const coreMargin = coreSellEx > 0 ? (coreProfit / coreSellEx) * 100 : 0;
                const msCostM = summary.msCostPerClientMonthly ?? 0;
                const msSellEx = summary.msSellExVatMonthly ?? 0;
                const msSellInc = summary.msSellIncVatMonthly ?? 0;
                const msProfit = msSellEx - msCostM;
                const msMargin = msSellEx > 0 ? (msProfit / msSellEx) * 100 : 0;
                const inv1Lines = [
                  ...setupLines,
                  ...infraOneTimeLines,
                  ...(coreSellEx > 0 ? [{ idx: setupLines.length + infraOneTimeLines.length + 1, name: "Core Platform Service — Month 1", type: "Month 1", cost: coreCostM, sellEx: coreSellEx, sellInc: coreSellInc, profit: coreProfit, margin: coreMargin }] : []),
                  ...(msSellEx > 0 ? [{ idx: setupLines.length + infraOneTimeLines.length + (coreSellEx > 0 ? 2 : 1), name: "Managed Services Add-On — Month 1", type: "Month 1", cost: msCostM, sellEx: msSellEx, sellInc: msSellInc, profit: msProfit, margin: msMargin }] : []),
                ];
                const inv1Total = inv1Lines.reduce((s, r) => s + r.sellInc, 0);
                const inv1Profit = inv1Lines.reduce((s, r) => s + r.profit, 0);
                const recurringLines = [
                  ...(coreSellEx > 0 ? [{ idx: 1, name: "Core Platform Service", type: "Recurring", cost: coreCostM, sellEx: coreSellEx, sellInc: coreSellInc, profit: coreProfit, margin: coreMargin }] : []),
                  ...(msSellEx > 0 ? [{ idx: 2, name: "Managed Services Add-On", type: "Recurring", cost: msCostM, sellEx: msSellEx, sellInc: msSellInc, profit: msProfit, margin: msMargin }] : []),
                ];
                const recTotal = recurringLines.reduce((s, r) => s + r.sellInc, 0);
                const recProfit = recurringLines.reduce((s, r) => s + r.profit, 0);

                const InvTable = ({ lines, totalInc, totalProfit }: { lines: typeof inv1Lines; totalInc: number; totalProfit: number }) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-6">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Line Item</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-28">Type</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-28">Cost (SAR)</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-28">Sell ex-VAT</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-32">Client Pays (inc.VAT)</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-24">Profit</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-16">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {lines.map((r) => (
                          <tr key={r.idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground tabular-nums">{String(r.idx).padStart(2, "0")}</td>
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2">
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                r.type === "Recurring" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                r.type === "Month 1" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              )}>{r.type}</span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(r.cost)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(r.sellEx)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(r.sellInc)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{fmt(r.profit)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.margin.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                          <td colSpan={5} className="px-3 py-2.5 text-sm">TOTAL</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{fmt(totalInc)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">{fmt(totalProfit)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-300">Profit</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );

                // Payment calendar
                const calRows = Array.from({ length: months }, (_, i) => {
                  const isFirst = i === 0;
                  const amount = isFirst ? inv1Total : recTotal;
                  const profit = isFirst ? inv1Profit : recProfit;
                  const running = isFirst ? inv1Total : inv1Total + recTotal * i;
                  return { inv: i + 1, label: `Month ${i + 1}`, what: isFirst ? "Setup + Server + 1st Month Service" : "Core Platform + Managed Services", amount, profit, running };
                });

                return (
                  <div className="divide-y divide-border/50">
                    {/* Invoice #1 */}
                    <div>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-violet-600/20 border-b border-violet-400/30 dark:bg-violet-900/30">
                        <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Invoice #1 · Due on Day 1, Before Any Work Begins</span>
                        <span className="text-xs text-violet-600 dark:text-violet-400">{nc} {nc === 1 ? "client" : "clients"} · {vat}% VAT</span>
                      </div>
                      <InvTable lines={inv1Lines} totalInc={inv1Total} totalProfit={inv1Profit} />
                    </div>
                    {/* Invoices 2-12 */}
                    {recurringLines.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-4 py-2.5 bg-teal-800/90 dark:bg-teal-900/80">
                          <span className="text-xs font-bold text-teal-100 uppercase tracking-wide">Invoices #2–{months} · Recurring Monthly (Same Every Month for {months - 1} Months)</span>
                        </div>
                        <InvTable lines={recurringLines} totalInc={recTotal} totalProfit={recProfit} />
                      </div>
                    )}
                    {/* Payment Calendar */}
                    <div>
                      <div className="px-4 py-2.5 bg-slate-700 dark:bg-slate-800">
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">Payment Calendar · {months}-Month Schedule + Profit per Invoice</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/60">
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-16">Invoice</th>
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Month</th>
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">What's Included</th>
                              <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-32">Amount (inc. VAT)</th>
                              <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-28">Profit / month</th>
                              <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-32">Running Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {calRows.map((r) => (
                              <tr key={r.inv} className={cn("hover:bg-muted/20 transition-colors", r.inv === 1 && "bg-violet-50/40 dark:bg-violet-950/20 font-medium")}>
                                <td className="px-3 py-1.5 tabular-nums">
                                  <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold",
                                    r.inv === 1 ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                                  )}>{r.inv}</span>
                                </td>
                                <td className="px-3 py-1.5 text-muted-foreground">{r.label}</td>
                                <td className="px-3 py-1.5">{r.what}</td>
                                <td className={cn("px-3 py-1.5 text-right tabular-nums font-semibold", r.inv === 1 ? "text-violet-600 dark:text-violet-400" : "")}>{fmt(r.amount)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(r.profit)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(r.running)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                              <td colSpan={3} className="px-3 py-2.5 text-sm">Year-1 Total (inc. VAT)</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{fmt(summary.year1TotalPerClient || 0)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">{fmt(inv1Profit + recProfit * (months - 1))}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-amber-300">{fmt((summary.year1TotalAllClients || 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </SectionBand>
          )}

        </div>
      </div>
    </div>
  );
}
