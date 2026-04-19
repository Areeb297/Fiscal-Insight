import { useState, useEffect } from "react";
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
  type Employee,
  type Subscription,
  type SalesSupportResource,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash, Save, Calculator, ArrowLeft, Server, Building2, TrendingUp, Wallet, Receipt, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const KNOWN_DEPTS = ["HC", "FIN", "OPS", "IT", "CS"] as const;

export default function Projection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const [, setLocation] = useLocation();
  const [otherDepts, setOtherDepts] = useState<Set<number>>(new Set());

  const routeId = params.id ? parseInt(params.id) : NaN;
  const hasRouteId = Number.isFinite(routeId) && routeId > 0;

  const { data: projections, isLoading: isLoadingProjections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() }
  });

  const { data: routeProjection, isLoading: isLoadingRouteProjection, isError: routeProjectionError } = useGetProjection(routeId, {
    query: { enabled: hasRouteId, queryKey: getGetProjectionQueryKey(routeId), retry: false }
  });

  const routeNotFound = hasRouteId && !isLoadingRouteProjection && (routeProjectionError || !routeProjection);
  const activeProjectionId = hasRouteId ? (routeProjection?.id) : projections?.[0]?.id;
  const activeProjection = hasRouteId ? routeProjection : projections?.[0];

  const { data: summary, isLoading: isLoadingSummary } = useGetProjectionSummary(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getGetProjectionSummaryQueryKey(activeProjectionId || 0) }
  });

  const { data: employees } = useListEmployees(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getListEmployeesQueryKey(activeProjectionId || 0) }
  });

  const { data: subscriptions } = useListSubscriptions(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getListSubscriptionsQueryKey(activeProjectionId || 0) }
  });

  const { data: salesSupport } = useListSalesSupportResources(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId || 0) }
  });

  const { data: vendorSetupFees } = useListVendorSetupFees(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getListVendorSetupFeesQueryKey(activeProjectionId || 0) }
  });

  const { data: infrastructureCosts } = useListInfrastructureCosts(activeProjectionId || 0, {
    query: { enabled: !!activeProjectionId, queryKey: getListInfrastructureCostsQueryKey(activeProjectionId || 0) }
  });

  const { data: ctcRules } = useListCtcRules({
    query: { queryKey: getListCtcRulesQueryKey() }
  });

  const { data: currencies } = useListCurrencies({
    query: { queryKey: getListCurrenciesQueryKey() }
  });

  const createProjection = useCreateProjection();
  const updateProjection = useUpdateProjection();
  
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const deleteSubscription = useDeleteSubscription();

  const createSalesSupport = useCreateSalesSupportResource();
  const updateSalesSupport = useUpdateSalesSupportResource();
  const deleteSalesSupport = useDeleteSalesSupportResource();

  const createVendor = useCreateVendorSetupFee();
  const updateVendor = useUpdateVendorSetupFee();
  const deleteVendor = useDeleteVendorSetupFee();

  const createInfra = useCreateInfrastructureCost();
  const updateInfra = useUpdateInfrastructureCost();
  const deleteInfra = useDeleteInfrastructureCost();

  const invalidateAll = () => {
    if (!activeProjectionId) return;
    queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleAddVendor = () => {
    if (!activeProjectionId) return;
    createVendor.mutate(
      { projectionId: activeProjectionId, data: { name: "New Setup Item", vendorName: "", currency: "SAR", amount: 0, amortizeMonths: 1, marginPercent: 30 } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };
  const handleUpdateVendor = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateVendor.mutate(
      { projectionId: activeProjectionId, id, data: { [field]: value } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };
  const handleDeleteVendor = (id: number) => {
    if (!activeProjectionId) return;
    deleteVendor.mutate(
      { projectionId: activeProjectionId, id },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorSetupFeesQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };

  const handleAddInfra = () => {
    if (!activeProjectionId) return;
    createInfra.mutate(
      { projectionId: activeProjectionId, data: { name: "New Infrastructure Line", category: "compute", currency: "SAR", amount: 0, billingCycle: "one_time", marginPercent: 5, allocationBasis: "shared" } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };
  const handleUpdateInfra = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateInfra.mutate(
      { projectionId: activeProjectionId, id, data: { [field]: value } },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };
  const handleDeleteInfra = (id: number) => {
    if (!activeProjectionId) return;
    deleteInfra.mutate(
      { projectionId: activeProjectionId, id },
      { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInfrastructureCostsQueryKey(activeProjectionId) }); invalidateAll(); } }
    );
  };

  const handleCreateInitialProjection = () => {
    createProjection.mutate(
      { data: { yearLabel: new Date().getFullYear().toString(), sarRate: 3.75, numClients: 1, marginPercent: 30 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectionsQueryKey() });
          toast({ title: "Projection created" });
        }
      }
    );
  };

  const handleUpdateProjectionSettings = (field: string, value: number | string | boolean) => {
    if (!activeProjectionId) return;
    updateProjection.mutate(
      { id: activeProjectionId, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProjectionQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getListProjectionsQueryKey() });
        }
      }
    );
  };

  const handleAddEmployee = () => {
    if (!activeProjectionId) return;
    createEmployee.mutate(
      { projectionId: activeProjectionId, data: { name: "New Employee", title: "Role", country: ctcRules?.[0]?.countryName || "KSA", salarySar: 0, monthsFte: 12, allocationPercent: 100 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleUpdateEmployee = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateEmployee.mutate(
      { projectionId: activeProjectionId, id, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleDeleteEmployee = (id: number) => {
    if (!activeProjectionId) return;
    deleteEmployee.mutate(
      { projectionId: activeProjectionId, id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleAddSubscription = () => {
    if (!activeProjectionId) return;
    createSubscription.mutate(
      { projectionId: activeProjectionId, data: { name: "New Sub", currency: "SAR", originalPrice: 0, isOneTime: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleUpdateSubscription = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateSubscription.mutate(
      { projectionId: activeProjectionId, id, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleDeleteSubscription = (id: number) => {
    if (!activeProjectionId) return;
    deleteSubscription.mutate(
      { projectionId: activeProjectionId, id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleAddSalesSupport = () => {
    if (!activeProjectionId) return;
    createSalesSupport.mutate(
      { projectionId: activeProjectionId, data: { name: "Project Manager", title: "PM", department: "OPS", country: ctcRules?.[0]?.countryName || "KSA", salarySar: 20000, ctcSar: 30000, months: 12, marginPercent: 30, allocationPercent: 100 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleUpdateSalesSupport = (id: number, field: string, value: any) => {
    if (!activeProjectionId) return;
    updateSalesSupport.mutate(
      { projectionId: activeProjectionId, id, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const handleDeleteSalesSupport = (id: number) => {
    if (!activeProjectionId) return;
    deleteSalesSupport.mutate(
      { projectionId: activeProjectionId, id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSalesSupportResourcesQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectionSummaryQueryKey(activeProjectionId) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }
      }
    );
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(val);

  const computeSellingPrice = (cost: number, marginRaw: number) => {
    if (!Number.isFinite(marginRaw) || marginRaw <= 0) return cost;
    const frac = marginRaw > 1 ? marginRaw / 100 : marginRaw;
    return frac < 1 ? cost / (1 - frac) : cost;
  };

  const normalizeMarginToFractionUI = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw > 1 ? raw / 100 : raw;
  };

  if (isLoadingProjections || (hasRouteId && isLoadingRouteProjection)) {
    return <div className="p-8 space-y-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (routeNotFound) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <Calculator className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Projection Not Found</h2>
        <p className="text-muted-foreground mb-6">This projection doesn't exist or has been deleted.</p>
        <Button onClick={() => setLocation("/projection")} size="lg">Back to Projections</Button>
      </div>
    );
  }

  if (!activeProjectionId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <Calculator className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">No Active Projection</h2>
        <p className="text-muted-foreground mb-6">Create a projection to start managing your department costs and margins.</p>
        <Button onClick={() => setLocation("/projection")} size="lg">Go to Projections</Button>
      </div>
    );
  }

  const headerName = activeProjection?.name?.trim() || `Projection ${activeProjection?.yearLabel ?? ""}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-5 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href="/projection">
                <Button variant="ghost" size="icon" className="mt-1"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  <Sparkles className="h-3.5 w-3.5" /> Projection workspace
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">{headerName}</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">Departmental cost engineering · per-client unit economics · price-to-margin modelling</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 md:min-w-[520px]">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Year label</Label>
                <Input
                  key={`yl-${activeProjection?.id}`}
                  defaultValue={activeProjection?.yearLabel ?? ""}
                  onBlur={(e) => handleUpdateProjectionSettings("yearLabel", e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fiscal year</Label>
                <Input
                  type="text"
                  placeholder="e.g. 2026-27"
                  key={`fy-${activeProjection?.id}`}
                  defaultValue={activeProjection?.fiscalYear ?? activeProjection?.yearLabel ?? ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    if (raw) handleUpdateProjectionSettings("fiscalYear", raw);
                  }}
                  className="h-10 bg-background tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Start month</Label>
                <Input
                  type="month"
                  key={`sm-${activeProjection?.id}`}
                  defaultValue={activeProjection?.startMonth ?? ""}
                  onBlur={(e) => {
                    handleUpdateProjectionSettings("startMonth", e.target.value.trim());
                  }}
                  className="h-10 bg-background tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Duration (yrs)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  key={`dy-${activeProjection?.id}`}
                  defaultValue={activeProjection?.durationYears ?? 1}
                  onBlur={(e) => handleUpdateProjectionSettings("durationYears", parseFloat(e.target.value))}
                  className="h-10 bg-background tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">VAT %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  key={`vat-${activeProjection?.id}`}
                  defaultValue={activeProjection?.vatRate ?? 15}
                  onBlur={(e) => handleUpdateProjectionSettings("vatRate", parseFloat(e.target.value))}
                  className="h-10 bg-background tabular-nums"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-lg border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <Switch
                id="autoInvoice"
                checked={activeProjection?.autoGenerateInvoices ?? false}
                onCheckedChange={(v) => handleUpdateProjectionSettings("autoGenerateInvoices", Boolean(v))}
              />
              <Label htmlFor="autoInvoice" className="text-sm font-medium">Auto-generate monthly invoices</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice day</Label>
              <Input
                type="number" min="1" max="28"
                key={`idom-${activeProjection?.id}`}
                defaultValue={activeProjection?.invoiceDayOfMonth ?? 1}
                onBlur={(e) => handleUpdateProjectionSettings("invoiceDayOfMonth", parseInt(e.target.value))}
                className="h-9 w-20 bg-background tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Net terms (days)</Label>
              <Input
                type="number" min="0" max="180"
                key={`pterms-${activeProjection?.id}`}
                defaultValue={activeProjection?.invoicePaymentTermsDays ?? 30}
                onBlur={(e) => handleUpdateProjectionSettings("invoicePaymentTermsDays", parseInt(e.target.value))}
                className="h-9 w-24 bg-background tabular-nums"
              />
            </div>
          </div>
        </div>
        {summary && (() => {
          const totalCostMonthly = summary.totalDeptCostMonthly + summary.totalOverheadMonthly;
          const totalCostEngagement = summary.totalDeptCostYearly + summary.totalOverheadYearly;
          const vatMonthly = summary.sellingPriceWithVatMonthly - summary.sellingPriceWithoutVat;
          const vatEngagement = summary.sellingPriceWithVatYearly - summary.sellingPriceWithoutVatYearly;
          const months = summary.engagementMonths;
          const engUnit = months === 1 ? "month" : `${months} mo`;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                { tone: "slate", icon: Wallet, label: "Total Department Cost", primary: formatCurrency(totalCostMonthly), unit: "/ mo", sub: `${formatCurrency(totalCostEngagement)} over ${engUnit}`, hint: "All team salaries + overheads (what we spend)" },
                { tone: "violet", icon: Wallet, label: "Cost / Client", primary: formatCurrency(summary.totalMonthlyCostPerClient), unit: "/ mo", sub: `${formatCurrency(summary.totalYearlyCostPerClient)} / ${engUnit}`, hint: `Full delivery cost per client (team + overhead + services + infra)` },
                { tone: "emerald", icon: TrendingUp, label: "Revenue · Monthly", primary: formatCurrency(summary.sellingPriceWithoutVat * (activeProjection?.numClients || 1)), unit: "/ mo", sub: `${formatCurrency(summary.sellingPriceWithoutVat)} × ${activeProjection?.numClients} clients`, hint: "Selling price excl. VAT, all clients combined" },
                { tone: "indigo", icon: TrendingUp, label: `Revenue · ${engUnit}`, primary: formatCurrency(summary.sellingPriceWithoutVatYearly * (activeProjection?.numClients || 1)), unit: `/ ${engUnit}`, sub: `${formatCurrency(summary.sellingPriceWithoutVatYearly)} × ${activeProjection?.numClients} clients`, hint: `Selling price excl. VAT over the ${engUnit} engagement` },
                { tone: "amber", icon: Receipt, label: `VAT (${activeProjection?.vatRate ?? 15}%)`, primary: formatCurrency(vatEngagement * (activeProjection?.numClients || 1)), unit: `/ ${engUnit}`, sub: `${formatCurrency(vatMonthly * (activeProjection?.numClients || 1))} / month`, hint: `Charge incl. VAT: ${formatCurrency(summary.sellingPriceWithVatYearly * (activeProjection?.numClients || 1))} / ${engUnit}` },
              ].map((kpi, i) => {
                const toneMap: Record<string, { ring: string; text: string; gradient: string; iconBg: string }> = {
                  slate: { ring: "ring-slate-200/60 dark:ring-slate-700/60", text: "text-slate-700 dark:text-slate-200", gradient: "from-slate-100/70 via-background to-background dark:from-slate-800/40", iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
                  emerald: { ring: "ring-emerald-200/60 dark:ring-emerald-700/40", text: "text-emerald-700 dark:text-emerald-300", gradient: "from-emerald-100/70 via-background to-background dark:from-emerald-900/30", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
                  indigo: { ring: "ring-indigo-200/60 dark:ring-indigo-700/40", text: "text-indigo-700 dark:text-indigo-300", gradient: "from-indigo-100/70 via-background to-background dark:from-indigo-900/30", iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
                  amber: { ring: "ring-amber-200/60 dark:ring-amber-700/40", text: "text-amber-700 dark:text-amber-300", gradient: "from-amber-100/70 via-background to-background dark:from-amber-900/30", iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
                  violet: { ring: "ring-violet-200/60 dark:ring-violet-700/40", text: "text-violet-700 dark:text-violet-300", gradient: "from-violet-100/70 via-background to-background dark:from-violet-900/30", iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
                };
                const t = toneMap[kpi.tone];
                const Icon = kpi.icon;
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 * i }}
                  >
                    <Card className={`relative overflow-hidden ring-1 ${t.ring} bg-gradient-to-br ${t.gradient} shadow-sm hover:shadow-md transition-shadow`}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.iconBg}`}><Icon className="h-4 w-4" /></div>
                        </div>
                        <div className={`mt-3 text-2xl font-bold tabular-nums ${t.text}`}>{kpi.primary}<span className="text-xs font-medium text-muted-foreground ml-1">{kpi.unit}</span></div>
                        <div className="text-xs text-muted-foreground mt-1 tabular-nums">{kpi.sub}</div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{kpi.hint}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}
      </motion.div>

      {/* 4-Stream Revenue Breakdown */}
      {summary && (summary.coreSellExVatMonthly != null || summary.msSellExVatMonthly != null) && (() => {
        const s = summary;
        const vat = activeProjection?.vatRate ?? 15;
        const nc = activeProjection?.numClients || 1;
        const streams = [
          {
            icon: Sparkles,
            tone: "blue",
            label: "Core Platform",
            sublabel: "Team + Tools · recurring",
            col1Label: "Cost / client / mo",
            col1: formatCurrency(s.coreCostPerClientMonthly ?? 0),
            col2Label: "Sell ex-VAT / mo",
            col2: formatCurrency(s.coreSellExVatMonthly ?? 0),
            col3Label: `Sell inc-VAT (${vat}%) / mo`,
            col3: formatCurrency(s.coreSellIncVatMonthly ?? 0),
            col4Label: "Yearly per client",
            col4: formatCurrency((s.coreSellIncVatMonthly ?? 0) * 12),
          },
          {
            icon: Building2,
            tone: "violet",
            label: "Managed Services",
            sublabel: "PM + support · engagement-weighted",
            col1Label: "Cost / client / mo",
            col1: formatCurrency(s.msCostPerClientMonthly ?? 0),
            col2Label: "Sell ex-VAT / mo",
            col2: formatCurrency(s.msSellExVatMonthly ?? 0),
            col3Label: `Sell inc-VAT (${vat}%) / mo`,
            col3: formatCurrency(s.msSellIncVatMonthly ?? 0),
            col4Label: "Yearly per client",
            col4: formatCurrency((s.msSellIncVatMonthly ?? 0) * 12),
          },
          {
            icon: Receipt,
            tone: "amber",
            label: "One-Time Setup",
            sublabel: "Vendor fees · billed once",
            col1Label: "Cost per client",
            col1: formatCurrency((s.vendorSetupTotalCost ?? 0) + (s.infraOneTimeCostPerClient ?? 0)),
            col2Label: "Sell ex-VAT",
            col2: formatCurrency((s.vendorSetupTotalSelling ?? 0) + (s.infraOneTimeSellExVatPerClient ?? 0)),
            col3Label: `Sell inc-VAT (${vat}%)`,
            col3: formatCurrency((s.vendorSetupTotalWithVat ?? 0) + (s.infraOneTimeSellIncVatPerClient ?? 0)),
            col4Label: `Total (${nc} clients)`,
            col4: formatCurrency(((s.vendorSetupTotalWithVat ?? 0) + (s.infraOneTimeSellIncVatPerClient ?? 0)) * nc),
          },
          {
            icon: TrendingUp,
            tone: "emerald",
            label: "Invoice Summary",
            sublabel: "Per client · 12-month engagement",
            col1Label: "Invoice #1 (inc-VAT)",
            col1: formatCurrency(s.invoice1TotalIncVat ?? 0),
            col2Label: "Invoices #2-12 each",
            col2: formatCurrency(s.invoiceRecurringIncVat ?? 0),
            col3Label: "Year-1 per client",
            col3: formatCurrency(s.year1TotalPerClient ?? 0),
            col4Label: `Year-1 × ${nc} clients`,
            col4: formatCurrency(s.year1TotalAllClients ?? 0),
          },
        ];
        const toneMap: Record<string, { ring: string; text: string; gradient: string; iconBg: string; labelColor: string }> = {
          blue: { ring: "ring-blue-200/60 dark:ring-blue-700/40", text: "text-blue-700 dark:text-blue-300", gradient: "from-blue-50/70 via-background to-background dark:from-blue-900/20", iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-300", labelColor: "text-blue-600 dark:text-blue-400" },
          violet: { ring: "ring-violet-200/60 dark:ring-violet-700/40", text: "text-violet-700 dark:text-violet-300", gradient: "from-violet-50/70 via-background to-background dark:from-violet-900/20", iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300", labelColor: "text-violet-600 dark:text-violet-400" },
          amber: { ring: "ring-amber-200/60 dark:ring-amber-700/40", text: "text-amber-700 dark:text-amber-300", gradient: "from-amber-50/70 via-background to-background dark:from-amber-900/20", iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300", labelColor: "text-amber-600 dark:text-amber-400" },
          emerald: { ring: "ring-emerald-200/60 dark:ring-emerald-700/40", text: "text-emerald-700 dark:text-emerald-300", gradient: "from-emerald-50/70 via-background to-background dark:from-emerald-900/20", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", labelColor: "text-emerald-600 dark:text-emerald-400" },
        };
        return (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue Streams · Per-Client Economics</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {streams.map((s, i) => {
                const t = toneMap[s.tone];
                const Icon = s.icon;
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 * i }}>
                    <Card className={`ring-1 ${t.ring} bg-gradient-to-br ${t.gradient} shadow-sm h-full`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${t.iconBg}`}><Icon className="h-3.5 w-3.5" /></div>
                          <div>
                            <div className={`text-xs font-bold uppercase tracking-wide ${t.labelColor}`}>{s.label}</div>
                            <div className="text-[10px] text-muted-foreground">{s.sublabel}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: s.col1Label, value: s.col1 },
                            { label: s.col2Label, value: s.col2 },
                            { label: s.col3Label, value: s.col3 },
                            { label: s.col4Label, value: s.col4 },
                          ].map((row) => (
                            <div key={row.label} className="flex items-baseline justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground leading-snug shrink-0">{row.label}</span>
                              <span className={`text-xs font-bold tabular-nums shrink-0 ${t.text}`}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Global Projection Settings</CardTitle>
          <CardDescription>Adjust base parameters that affect all calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sarRate">SAR Exchange Rate (vs USD)</Label>
              <Input 
                id="sarRate" 
                type="number" 
                step="0.01" 
                key={`sar-${activeProjection?.id}`}
                defaultValue={activeProjection?.sarRate} 
                onBlur={(e) => handleUpdateProjectionSettings("sarRate", parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numClients">Number of Clients</Label>
              <Input 
                id="numClients" 
                type="number" 
                min="1" 
                key={`nc-${activeProjection?.id}`}
                defaultValue={activeProjection?.numClients} 
                onBlur={(e) => handleUpdateProjectionSettings("numClients", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginPercent">Target Margin (%)</Label>
              <Input 
                id="marginPercent" 
                type="number" 
                step="0.1" 
                key={`mp-${activeProjection?.id}`}
                defaultValue={activeProjection?.marginPercent} 
                onBlur={(e) => handleUpdateProjectionSettings("marginPercent", parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Department Cost (Employees) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <div>
            <CardTitle>Department Cost (Team)</CardTitle>
            <CardDescription>Manage your team and their associated costs</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddEmployee} className="self-start sm:self-auto"><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[150px]">Title</TableHead>
                  <TableHead className="w-[150px]">Country</TableHead>
                  <TableHead className="w-[150px]">Salary (SAR)</TableHead>
                  <TableHead className="w-[100px]">Months</TableHead>
                  <TableHead className="w-[110px] text-right">Alloc %</TableHead>
                  <TableHead className="w-[160px]">Basis</TableHead>
                  <TableHead className="w-[100px] text-right">CTC</TableHead>
                  <TableHead className="w-[150px] text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="p-2">
                      <Input defaultValue={emp.name} onBlur={(e) => handleUpdateEmployee(emp.id, "name", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input defaultValue={emp.title} onBlur={(e) => handleUpdateEmployee(emp.id, "title", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select defaultValue={emp.country} onValueChange={(val) => handleUpdateEmployee(emp.id, "country", val)}>
                        <SelectTrigger className="h-9 border-transparent hover:border-input focus:border-input bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ctcRules?.map(r => (
                            <SelectItem key={r.id} value={r.countryName}>{r.countryName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" defaultValue={emp.salarySar} onBlur={(e) => handleUpdateEmployee(emp.id, "salarySar", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" step="0.5" defaultValue={emp.monthsFte} onBlur={(e) => handleUpdateEmployee(emp.id, "monthsFte", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" min="0" max="100" step="1" defaultValue={emp.allocationPercent ?? 100} onBlur={(e) => handleUpdateEmployee(emp.id, "allocationPercent", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" title="Percentage of time this person is allocated (e.g. 10 = 10%, 100 = full-time)" />
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center gap-1">
                        <Select
                          value={emp.costBasis ?? "shared"}
                          onValueChange={(val) => handleUpdateEmployee(emp.id, "costBasis", val)}
                        >
                          <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-xs px-2" title="Shared = pooled across all clients (cost ÷ N). Per-client = cost is incurred per assigned client (cost × N).">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shared">Shared</SelectItem>
                            <SelectItem value="per_client">Per-client</SelectItem>
                          </SelectContent>
                        </Select>
                        {emp.costBasis === "per_client" && (
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={emp.assignedClientCount ?? activeProjection?.numClients ?? 0}
                            onBlur={(e) => handleUpdateEmployee(emp.id, "assignedClientCount", parseInt(e.target.value) || null)}
                            className="h-8 w-14 border-transparent hover:border-input focus:border-input bg-transparent text-right text-xs"
                            title="Number of clients this resource is assigned to. Defaults to total client count."
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-2">{emp.ctc}</TableCell>
                    <TableCell className="text-right font-medium p-2">
                      <div>{formatCurrency(emp.totalYearlyCost)}</div>
                      {(() => {
                        const alloc = emp.allocationPercent ?? 100;
                        if (alloc < 100) {
                          const fullCost = alloc > 0
                            ? emp.totalYearlyCost / (alloc / 100)
                            : emp.ctc * emp.monthsFte;
                          return (
                            <div className="text-[10px] font-normal text-muted-foreground tabular-nums" title="What this would cost at 100% allocation">
                              (100%: {formatCurrency(fullCost)})
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteEmployee(emp.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!employees?.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No employees added.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-bold">Grand Total Monthly:</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatCurrency(summary?.totalDeptCostMonthly || 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} className="text-right font-bold">Grand Total (Engagement{summary?.engagementMonths ? ` · ${summary.engagementMonths} mo` : ""}):</TableCell>
                  <TableCell className="text-right font-bold text-primary tabular-nums">{formatCurrency(summary?.totalDeptCostYearly || 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {/* Section 2: Overheads & Subscriptions */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <div>
              <CardTitle>Overheads & Subscriptions</CardTitle>
              <CardDescription>Software and operational expenses</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddSubscription} className="self-start sm:self-auto"><Plus className="h-4 w-4 mr-2" /> Add Overhead</Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Name</TableHead>
                    <TableHead className="w-[150px]">Type</TableHead>
                    <TableHead className="w-[120px]">Currency</TableHead>
                    <TableHead className="w-[160px] text-right">Price (orig.)</TableHead>
                    <TableHead className="w-[140px] text-right">SAR / mo</TableHead>
                    <TableHead className="w-[140px] text-right">SAR / yr</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="p-2">
                        <Input defaultValue={sub.name} onBlur={(e) => handleUpdateSubscription(sub.id, "name", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent font-medium" />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select value={sub.isOneTime ? "one-time" : "recurring"} onValueChange={(val) => handleUpdateSubscription(sub.id, "isOneTime", val === "one-time")}>
                          <SelectTrigger className="h-9 border-transparent hover:border-input focus:border-input bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recurring">Recurring</SelectItem>
                            <SelectItem value="one-time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select defaultValue={sub.currency} onValueChange={(val) => handleUpdateSubscription(sub.id, "currency", val)}>
                          <SelectTrigger className="h-9 border-transparent hover:border-input focus:border-input bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies?.map(c => (
                              <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" defaultValue={sub.originalPrice} onBlur={(e) => handleUpdateSubscription(sub.id, "originalPrice", parseFloat(e.target.value))} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent text-right tabular-nums" />
                      </TableCell>
                      <TableCell className="text-right font-medium p-2 tabular-nums">{formatCurrency(sub.monthlySar)}</TableCell>
                      <TableCell className="text-right font-medium p-2 tabular-nums">{formatCurrency(sub.yearlySar)}</TableCell>
                      <TableCell className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSubscription(sub.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!subscriptions?.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No subscriptions added.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-medium">Total Overhead:</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(summary?.totalOverheadMonthly || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(summary?.totalOverheadYearly || 0)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Schedule Summary — replaces the old bundled Per-Client Economics card */}
        <Card className="bg-primary text-primary-foreground border-primary/40 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Schedule · Per Client</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground/90">
                {activeProjection?.numClients} client{(activeProjection?.numClients || 0) === 1 ? "" : "s"} · {Math.round((normalizeMarginToFractionUI(activeProjection?.marginPercent || 0)) * 100)}% margin
              </span>
            </CardTitle>
            <CardDescription className="text-primary-foreground/70">
              Invoice #1 includes setup fees + first month. Invoices #2–12 are recurring only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Two-column hero: Day-1 vs Recurring */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary-foreground/15 backdrop-blur-sm p-4 border border-primary-foreground/20">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-primary-foreground/70 mb-1.5">Invoice #1 · Setup</div>
                <div className="text-3xl font-bold tabular-nums">{formatCurrency(summary?.invoice1TotalIncVat || 0)}</div>
                <div className="text-xs text-primary-foreground/70 mt-1">inc. VAT · one-time + Month 1</div>
              </div>
              <div className="rounded-xl bg-primary-foreground/15 backdrop-blur-sm p-4 border border-primary-foreground/20">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-primary-foreground/70 mb-1.5">Invoices #2–12 · Recurring</div>
                <div className="text-3xl font-bold tabular-nums">{formatCurrency(summary?.invoiceRecurringIncVat || 0)}</div>
                <div className="text-xs text-primary-foreground/70 mt-1">inc. VAT · per month × 11</div>
              </div>
            </div>
            {/* Year-1 totals */}
            <div className="rounded-lg border border-primary-foreground/20 text-sm overflow-x-auto">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-primary-foreground/10 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
                <div className="px-3 py-2">Year-1 Summary</div>
                <div className="px-3 py-2 text-right">Per Client</div>
                <div className="px-3 py-2 text-right">All {activeProjection?.numClients || "?"} Clients</div>
              </div>
              <div className="divide-y divide-primary-foreground/10">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
                  <div className="px-3 py-2 text-primary-foreground/80">Recurring revenue (×11)</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency((summary?.invoiceRecurringIncVat || 0) * 11)}</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency((summary?.invoiceRecurringIncVat || 0) * 11 * (activeProjection?.numClients || 1))}</div>
                </div>
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
                  <div className="px-3 py-2 text-primary-foreground/80">Setup invoice (×1)</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary?.invoice1TotalIncVat || 0)}</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency((summary?.invoice1TotalIncVat || 0) * (activeProjection?.numClients || 1))}</div>
                </div>
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center bg-primary-foreground/10">
                  <div className="px-3 py-2 font-semibold">Year-1 Total (inc. VAT)</div>
                  <div className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(summary?.year1TotalPerClient || 0)}</div>
                  <div className="px-3 py-2 text-right font-bold tabular-nums text-emerald-200">{formatCurrency(summary?.year1TotalAllClients || 0)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Sales Support Resources */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
          <div>
            <CardTitle>Sales Support & Managed Services</CardTitle>
            <CardDescription>Add resources specific to client contracts with custom margins</CardDescription>
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddSalesSupport} className="self-start sm:self-auto"><Plus className="h-4 w-4 mr-2" /> Add Resource</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[2200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Name</TableHead>
                  <TableHead className="w-[180px]">Title</TableHead>
                  <TableHead className="w-[140px]">Department</TableHead>
                  <TableHead className="w-[140px]">Country</TableHead>
                  <TableHead className="w-[160px] text-right">Salary (SAR)</TableHead>
                  <TableHead className="w-[160px] text-right" title="Override CTC directly (leave blank to derive from Salary × CTC multiplier)">CTC / mo (SAR)</TableHead>
                  <TableHead className="w-[120px] text-right">Months</TableHead>
                  <TableHead className="w-[120px] text-right">Alloc %</TableHead>
                  <TableHead className="w-[240px]">Basis</TableHead>
                  <TableHead className="w-[90px] text-center">In Totals</TableHead>
                  <TableHead className="w-[120px] text-right">Margin %</TableHead>
                  <TableHead className="w-[160px] text-right">Total Cost</TableHead>
                  <TableHead className="w-[160px] text-right">Selling Price</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesSupport?.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="p-2 align-middle">
                      <Input defaultValue={res.name ?? ""} onBlur={(e) => handleUpdateSalesSupport(res.id, "name", e.target.value)} className="h-10" placeholder="Full name" />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input defaultValue={res.title} onBlur={(e) => handleUpdateSalesSupport(res.id, "title", e.target.value)} className="h-10" placeholder="Job title" />
                    </TableCell>
                    <TableCell className="p-2 align-middle min-w-[120px]">
                      {(() => {
                        const isKnown = (KNOWN_DEPTS as readonly string[]).includes(res.department ?? "");
                        const showOther = otherDepts.has(res.id) || (!isKnown && !!res.department);
                        return (
                          <div className="flex flex-col gap-1">
                            <Select
                              value={showOther ? "Other" : (res.department ?? "")}
                              onValueChange={(val) => {
                                if (val === "Other") {
                                  setOtherDepts((prev) => new Set([...prev, res.id]));
                                } else {
                                  setOtherDepts((prev) => { const s = new Set(prev); s.delete(res.id); return s; });
                                  handleUpdateSalesSupport(res.id, "department", val);
                                }
                              }}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Dept" />
                              </SelectTrigger>
                              <SelectContent>
                                {KNOWN_DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                <SelectItem value="Other">Other…</SelectItem>
                              </SelectContent>
                            </Select>
                            {showOther && (
                              <Input
                                defaultValue={isKnown ? "" : (res.department ?? "")}
                                placeholder="Specify…"
                                className="h-9"
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v) handleUpdateSalesSupport(res.id, "department", v);
                                }}
                              />
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Select defaultValue={res.country} onValueChange={(val) => handleUpdateSalesSupport(res.id, "country", val)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ctcRules?.map(r => (
                            <SelectItem key={r.id} value={r.countryName}>{r.countryName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        type="number"
                        inputMode="decimal"
                        defaultValue={res.salarySar}
                        onBlur={(e) => handleUpdateSalesSupport(res.id, "salarySar", parseFloat(e.target.value))}
                        className="h-10 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        key={`ctc-${res.id}-${res.ctcSar}`}
                        type="number"
                        inputMode="decimal"
                        defaultValue={res.ctcSar ?? res.ctc ?? ""}
                        placeholder={String(Math.round(res.ctc ?? 0))}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          handleUpdateSalesSupport(res.id, "ctcSar", v === "" ? null : parseFloat(v));
                        }}
                        className="h-10 text-right tabular-nums"
                        title="Override monthly CTC directly. Leave blank to derive from Salary × CTC multiplier."
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        defaultValue={res.months}
                        onBlur={(e) => handleUpdateSalesSupport(res.id, "months", parseFloat(e.target.value))}
                        className="h-10 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="p-2 align-middle">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="100"
                        step="1"
                        defaultValue={res.allocationPercent ?? 100}
                        onBlur={(e) => handleUpdateSalesSupport(res.id, "allocationPercent", parseFloat(e.target.value))}
                        className="h-10 text-right tabular-nums"
                        title="Percentage of time this resource is involved (e.g. 10 = PM at 10%, 100 = full-time)"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center gap-1">
                        <Select
                          value={res.costBasis ?? "shared"}
                          onValueChange={(val) => handleUpdateSalesSupport(res.id, "costBasis", val)}
                        >
                          <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-xs px-2" title="Shared = pooled across all clients. Per-client = cost is incurred per assigned client.">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shared">Shared</SelectItem>
                            <SelectItem value="per_client">Per-client</SelectItem>
                          </SelectContent>
                        </Select>
                        {res.costBasis === "per_client" && (
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={res.assignedClientCount ?? activeProjection?.numClients ?? 0}
                            onBlur={(e) => handleUpdateSalesSupport(res.id, "assignedClientCount", parseInt(e.target.value) || null)}
                            className="h-10 w-24 border border-input bg-background text-right px-3"
                            title="Number of clients this resource is assigned to."
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <Checkbox
                        checked={!!res.includeInTotals}
                        onCheckedChange={(checked) => handleUpdateSalesSupport(res.id, "includeInTotals", checked === true)}
                        title="When checked, this row's amortized monthly cost folds into per-client economics. When unchecked, it stays as an optional add-on with its own selling price."
                        aria-label="Include in totals"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" step="0.1" defaultValue={res.marginPercent} onBlur={(e) => handleUpdateSalesSupport(res.id, "marginPercent", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                    </TableCell>
                    <TableCell className="text-right font-medium p-2 text-muted-foreground">
                      <div>{formatCurrency(res.totalSalaryCost)}</div>
                      {(() => {
                        const alloc = res.allocationPercent ?? 100;
                        if (alloc < 100) {
                          const fullCost = alloc > 0
                            ? res.totalSalaryCost / (alloc / 100)
                            : res.ctc * res.months;
                          return (
                            <div className="text-[10px] font-normal tabular-nums" title="What this would cost at 100% allocation">
                              (100%: {formatCurrency(fullCost)})
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary p-2">{formatCurrency(computeSellingPrice(res.totalSalaryCost, res.marginPercent))}</TableCell>
                    <TableCell className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSalesSupport(res.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!salesSupport?.length && (
                  <TableRow>
                    <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">No sales support resources added.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* One Time Setup Fees */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> One Time Setup Fees</CardTitle>
            <CardDescription className="mt-1">Single upfront charges billed once at project start (not amortized into monthly).</CardDescription>
          </div>
          <Button onClick={handleAddVendor} size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-1.5" /> Add line</Button>
        </CardHeader>
        <CardContent>
          {(() => {
            const vatPct = activeProjection?.vatRate ?? 15;
            const rows = (vendorSetupFees || []).map((v) => {
              const fxToSar = (cur: string) => {
                if (!cur || cur === "SAR") return 1;
                if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                return currencies?.find(x => x.code === cur)?.rateToSar ?? 1;
              };
              const cost = (v.amount || 0) * fxToSar(v.currency || "SAR");
              const selling = computeSellingPrice(cost, v.marginPercent ?? 0);
              const marginSar = selling - cost;
              const vat = selling * (vatPct / 100);
              const totalWithVat = selling + vat;
              return { v, cost, marginSar, vat, totalWithVat };
            });
            const totals = rows.reduce(
              (acc, r) => ({
                cost: acc.cost + r.cost,
                marginSar: acc.marginSar + r.marginSar,
                vat: acc.vat + r.vat,
                totalWithVat: acc.totalWithVat + r.totalWithVat,
              }),
              { cost: 0, marginSar: 0, vat: 0, totalWithVat: 0 },
            );
            return (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-right">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Vendor Cost (SAR)</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead className="text-right">Margin (SAR)</TableHead>
                      <TableHead className="text-right">VAT ({vatPct}%)</TableHead>
                      <TableHead className="text-right">Total w/ VAT</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ v, cost, marginSar, vat, totalWithVat }, idx) => (
                      <TableRow key={v.id}>
                        <TableCell className="p-2 text-right text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                        <TableCell className="p-2"><Input defaultValue={v.name} onBlur={(e) => handleUpdateVendor(v.id, "name", e.target.value)} className="h-9" placeholder="e.g. Implementation, License" /></TableCell>
                        <TableCell className="p-2"><Input type="number" step="0.01" defaultValue={cost} onBlur={(e) => handleUpdateVendor(v.id, "amount", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                        <TableCell className="p-2"><Input type="number" step="0.5" defaultValue={v.marginPercent} onBlur={(e) => handleUpdateVendor(v.id, "marginPercent", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                        <TableCell className="p-2 text-right font-mono text-sm tabular-nums">{formatCurrency(marginSar)}</TableCell>
                        <TableCell className="p-2 text-right font-mono text-sm text-muted-foreground tabular-nums">{formatCurrency(vat)}</TableCell>
                        <TableCell className="p-2 text-right font-bold text-primary tabular-nums">{formatCurrency(totalWithVat)}</TableCell>
                        <TableCell className="p-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVendor(v.id)}><Trash className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length && (
                      <TableRow><TableCell colSpan={8} className="h-20 text-center text-muted-foreground">No one-time setup fees yet. Add your first line.</TableCell></TableRow>
                    )}
                    {rows.length > 0 && (
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className="p-2"></TableCell>
                        <TableCell className="p-2">Total</TableCell>
                        <TableCell className="p-2 text-right tabular-nums">{formatCurrency(totals.cost)}</TableCell>
                        <TableCell className="p-2"></TableCell>
                        <TableCell className="p-2 text-right tabular-nums">{formatCurrency(totals.marginSar)}</TableCell>
                        <TableCell className="p-2 text-right tabular-nums">{formatCurrency(totals.vat)}</TableCell>
                        <TableCell className="p-2 text-right tabular-nums text-primary">{formatCurrency(totals.totalWithVat)}</TableCell>
                        <TableCell className="p-2"></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Infrastructure Costs */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Infrastructure Costs</CardTitle>
            <CardDescription className="mt-1">Recurring infrastructure (compute, storage, SaaS, networking) with billing cycle, margin and allocation basis.</CardDescription>
          </div>
          <Button onClick={handleAddInfra} size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-1.5" /> Add line</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Cost (SAR)</TableHead>
                  <TableHead className="text-right">Selling price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {infrastructureCosts?.map((line) => {
                  const fxToSar = (cur: string) => {
                    if (cur === "SAR") return 1;
                    if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                    const c = currencies?.find(x => x.code === cur);
                    return c?.rateToSar ?? 1;
                  };
                  const sarAmount = (line.amount || 0) * fxToSar(line.currency || "SAR");
                  const cycle = line.billingCycle || "one_time";
                  const isOneTime = cycle === "one_time";
                  const displayCost = isOneTime ? sarAmount : cycle === "annual" ? sarAmount / 12 : sarAmount;
                  const sellingDisplay = computeSellingPrice(displayCost, line.marginPercent ?? 0);
                  return (
                    <TableRow key={line.id} className={isOneTime ? "bg-amber-50/30 dark:bg-amber-950/20" : ""}>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Input defaultValue={line.name} onBlur={(e) => handleUpdateInfra(line.id, "name", e.target.value)} className="h-9" />
                          {isOneTime && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded shrink-0">Setup</span>}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select value={line.category || "compute"} onValueChange={(val) => handleUpdateInfra(line.id, "category", val)}>
                          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
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
                      <TableCell className="p-2">
                        <Select value={line.currency || "SAR"} onValueChange={(val) => handleUpdateInfra(line.id, "currency", val)}>
                          <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(currencies && currencies.length > 0 ? currencies.map(c => c.code) : ["SAR", "USD"]).map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2"><Input type="number" step="0.01" defaultValue={line.amount} onBlur={(e) => handleUpdateInfra(line.id, "amount", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-2">
                        <Select value={cycle} onValueChange={(val) => handleUpdateInfra(line.id, "billingCycle", val)}>
                          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="one_time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select value={line.allocationBasis || "shared"} onValueChange={(val) => handleUpdateInfra(line.id, "allocationBasis", val)}>
                          <SelectTrigger className="h-9 w-32" title="Shared = pooled across all clients. Per-client = cost is incurred per client."><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shared">Shared</SelectItem>
                            <SelectItem value="per_client">Per-client</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2"><Input type="number" step="0.5" defaultValue={line.marginPercent} onBlur={(e) => handleUpdateInfra(line.id, "marginPercent", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-2 text-right font-mono text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(displayCost)}
                        <div className="text-[9px] text-muted-foreground">{isOneTime ? "one-time" : cycle === "annual" ? "/ mo (annual)" : "/ mo"}</div>
                      </TableCell>
                      <TableCell className="p-2 text-right font-bold text-primary tabular-nums">
                        {formatCurrency(sellingDisplay)}
                        <div className="text-[9px] text-muted-foreground">{isOneTime ? "one-time" : "/ mo"}</div>
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteInfra(line.id)}><Trash className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!infrastructureCosts?.length && (
                  <TableRow><TableCell colSpan={10} className="h-20 text-center text-muted-foreground">No infrastructure lines yet. Add cloud/SaaS/networking costs to model recurring overhead.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
