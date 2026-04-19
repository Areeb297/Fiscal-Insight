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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash, Save, Calculator, ArrowLeft, Server, Building2, TrendingUp, Wallet, Receipt, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Projection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const [, setLocation] = useLocation();

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
      { projectionId: activeProjectionId, data: { name: "New Vendor Setup", vendorName: "", currency: "SAR", amount: 0, amortizeMonths: summary?.engagementMonths || 12, marginPercent: 20 } },
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
      { projectionId: activeProjectionId, data: { name: "New Infrastructure Line", category: "compute", currency: "SAR", amount: 0, billingCycle: "monthly", marginPercent: 20, allocationBasis: "shared" } },
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

  const handleUpdateProjectionSettings = (field: string, value: number | string) => {
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
      { projectionId: activeProjectionId, data: { title: "New Resource", country: ctcRules?.[0]?.countryName || "KSA", salarySar: 0, months: 12, marginPercent: 20, allocationPercent: 100 } },
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
                  type="number"
                  min="2020"
                  max="2099"
                  key={`fy-${activeProjection?.id}`}
                  defaultValue={activeProjection?.fiscalYear ?? new Date().getFullYear()}
                  onBlur={(e) => handleUpdateProjectionSettings("fiscalYear", parseInt(e.target.value))}
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
        </div>
        {summary && (() => {
          const totalCostMonthly = summary.totalDeptCostMonthly + summary.totalOverheadMonthly;
          const totalCostEngagement = summary.totalDeptCostYearly + summary.totalOverheadYearly;
          const vatMonthly = summary.sellingPriceWithVatMonthly - summary.sellingPriceWithoutVat;
          const vatEngagement = summary.sellingPriceWithVatYearly - summary.sellingPriceWithoutVatYearly;
          const months = summary.engagementMonths;
          const engUnit = months === 1 ? "month" : `${months} mo`;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { tone: "slate", icon: Wallet, label: "Total Department Cost", primary: formatCurrency(totalCostMonthly), unit: "/ mo", sub: `${formatCurrency(totalCostEngagement)} over ${engUnit}`, hint: "All team salaries + overheads (what we spend)" },
                { tone: "emerald", icon: TrendingUp, label: "Revenue · Monthly", primary: formatCurrency(summary.sellingPriceWithoutVat * (activeProjection?.numClients || 1)), unit: "/ mo", sub: `${formatCurrency(summary.sellingPriceWithoutVat)} × ${activeProjection?.numClients} clients`, hint: "Selling price excl. VAT, all clients combined" },
                { tone: "indigo", icon: TrendingUp, label: `Revenue · ${engUnit}`, primary: formatCurrency(summary.sellingPriceWithoutVatYearly * (activeProjection?.numClients || 1)), unit: `/ ${engUnit}`, sub: `${formatCurrency(summary.sellingPriceWithoutVatYearly)} × ${activeProjection?.numClients} clients`, hint: `Selling price excl. VAT over the ${engUnit} engagement` },
                { tone: "amber", icon: Receipt, label: `VAT (${activeProjection?.vatRate ?? 15}%)`, primary: formatCurrency(vatEngagement * (activeProjection?.numClients || 1)), unit: `/ ${engUnit}`, sub: `${formatCurrency(vatMonthly * (activeProjection?.numClients || 1))} / month`, hint: `Charge incl. VAT: ${formatCurrency(summary.sellingPriceWithVatYearly * (activeProjection?.numClients || 1))} / ${engUnit}` },
              ].map((kpi, i) => {
                const toneMap: Record<string, { ring: string; text: string; gradient: string; iconBg: string }> = {
                  slate: { ring: "ring-slate-200/60 dark:ring-slate-700/60", text: "text-slate-700 dark:text-slate-200", gradient: "from-slate-100/70 via-background to-background dark:from-slate-800/40", iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
                  emerald: { ring: "ring-emerald-200/60 dark:ring-emerald-700/40", text: "text-emerald-700 dark:text-emerald-300", gradient: "from-emerald-100/70 via-background to-background dark:from-emerald-900/30", iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
                  indigo: { ring: "ring-indigo-200/60 dark:ring-indigo-700/40", text: "text-indigo-700 dark:text-indigo-300", gradient: "from-indigo-100/70 via-background to-background dark:from-indigo-900/30", iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
                  amber: { ring: "ring-amber-200/60 dark:ring-amber-700/40", text: "text-amber-700 dark:text-amber-300", gradient: "from-amber-100/70 via-background to-background dark:from-amber-900/30", iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
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

        {/* Client Economics Summary */}
        <Card className="bg-primary text-primary-foreground border-primary/40 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Per-Client Economics</span>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground/90">
                {activeProjection?.numClients} client{(activeProjection?.numClients || 0) === 1 ? "" : "s"} · {Math.round((normalizeMarginToFractionUI(activeProjection?.marginPercent || 0)) * 100)}% margin
              </span>
            </CardTitle>
            <CardDescription className="text-primary-foreground/70">
              Recommended price to charge per client to hit your target margin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hero callout */}
            <div className="rounded-xl bg-primary-foreground/15 backdrop-blur-sm p-5 border border-primary-foreground/20">
              <div className="text-xs uppercase tracking-wider font-semibold text-primary-foreground/70 mb-2">
                Recommended Selling Price (ex. VAT)
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <div className="text-4xl font-bold tabular-nums">
                  {formatCurrency(summary?.sellingPriceWithoutVat || 0)}
                </div>
                <div className="text-sm text-primary-foreground/70">/ client / month</div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-primary-foreground/80 flex-wrap">
                <span>= <strong className="tabular-nums">{formatCurrency(summary?.sellingPriceWithoutVatYearly || 0)}</strong> / yr</span>
                <span className="text-primary-foreground/40">·</span>
                <span>incl. 15% VAT: <strong className="tabular-nums">{formatCurrency(summary?.sellingPriceWithVatMonthly || 0)}</strong> /mo</span>
              </div>
            </div>

            {/* Breakdown table */}
            <div className="rounded-lg border border-primary-foreground/20 overflow-x-auto text-sm">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-primary-foreground/10 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">
                <div className="px-3 py-2">Breakdown</div>
                <div className="px-3 py-2 text-right">Monthly</div>
                <div className="px-3 py-2 text-right">Engagement{summary?.engagementMonths ? ` (${summary.engagementMonths} mo)` : ""}</div>
              </div>
              <div className="divide-y divide-primary-foreground/10">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
                  <div className="px-3 py-2 text-primary-foreground/80">Team cost / client</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary?.costPerClientMonthly || 0)}</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary?.costPerClientYearly || 0)}</div>
                </div>
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
                  <div className="px-3 py-2 text-primary-foreground/80">Overhead / client</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary?.overheadPerClientMonthly || 0)}</div>
                  <div className="px-3 py-2 text-right tabular-nums">{formatCurrency(summary?.overheadPerClientYearly || 0)}</div>
                </div>
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center bg-primary-foreground/10">
                  <div className="px-3 py-2 font-semibold">Total cost / client</div>
                  <div className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(summary?.totalMonthlyCostPerClient || 0)}</div>
                  <div className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(summary?.totalYearlyCostPerClient || 0)}</div>
                </div>
                <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center">
                  <div className="px-3 py-2 text-primary-foreground/80">Margin (SAR)</div>
                  <div className="px-3 py-2 text-right font-medium text-emerald-200 tabular-nums">{formatCurrency(summary?.marginSarMonthly || 0)}</div>
                  <div className="px-3 py-2 text-right font-medium text-emerald-200 tabular-nums">{formatCurrency(summary?.marginSarYearly || 0)}</div>
                </div>
              </div>
            </div>

            {(summary?.oneTimeCostsTotal || 0) > 0 && (
              <div className="text-xs text-primary-foreground/70 px-1">
                Includes {formatCurrency(summary?.oneTimeCostsTotal || 0)} of one-time costs amortized across the year.
              </div>
            )}
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
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Title</TableHead>
                  <TableHead className="w-[160px]">Country</TableHead>
                  <TableHead className="w-[180px] text-right">Salary (SAR)</TableHead>
                  <TableHead className="w-[160px] text-right">CTC (SAR)</TableHead>
                  <TableHead className="w-[140px] text-right">Months</TableHead>
                  <TableHead className="w-[140px] text-right">Alloc %</TableHead>
                  <TableHead className="w-[260px]">Basis</TableHead>
                  <TableHead className="w-[100px] text-center">In Totals</TableHead>
                  <TableHead className="w-[140px] text-right">Margin %</TableHead>
                  <TableHead className="w-[180px] text-right">Total Cost</TableHead>
                  <TableHead className="w-[180px] text-right">Selling Price</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesSupport?.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="p-2 align-middle">
                      <Input defaultValue={res.title} onBlur={(e) => handleUpdateSalesSupport(res.id, "title", e.target.value)} className="h-10" />
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
                    <TableCell className="text-right font-mono text-sm p-2 text-muted-foreground whitespace-nowrap tabular-nums align-middle">{formatCurrency(res.ctc)}</TableCell>
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
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No sales support resources added.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Setup Fees */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Vendor Setup Fees</CardTitle>
            <CardDescription className="mt-1">One-off vendor onboarding & implementation costs, amortized across the engagement.</CardDescription>
          </div>
          <Button onClick={handleAddVendor} size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-1.5" /> Add line</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Amortize (mo)</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Monthly cost (SAR)</TableHead>
                  <TableHead className="text-right">Selling / mo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSetupFees?.map((v) => {
                  const fxToSar = (cur: string) => {
                    if (cur === "SAR") return 1;
                    if (cur === "USD") return activeProjection?.sarRate ?? 3.75;
                    const c = currencies?.find(x => x.code === cur);
                    return c?.rateToSar ?? 1;
                  };
                  const sarAmount = (v.amount || 0) * fxToSar(v.currency || "SAR");
                  const months = Math.max(1, v.amortizeMonths || 1);
                  const monthlyCost = sarAmount / months;
                  const sellingMonthly = computeSellingPrice(monthlyCost, v.marginPercent ?? 0);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="p-2"><Input defaultValue={v.name} onBlur={(e) => handleUpdateVendor(v.id, "name", e.target.value)} className="h-9" /></TableCell>
                      <TableCell className="p-2"><Input defaultValue={v.vendorName ?? ""} onBlur={(e) => handleUpdateVendor(v.id, "vendorName", e.target.value)} className="h-9" placeholder="e.g. AWS, Microsoft" /></TableCell>
                      <TableCell className="p-2">
                        <Select value={v.currency || "SAR"} onValueChange={(val) => handleUpdateVendor(v.id, "currency", val)}>
                          <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(currencies && currencies.length > 0 ? currencies.map(c => c.code) : ["SAR", "USD"]).map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2"><Input type="number" step="0.01" defaultValue={v.amount} onBlur={(e) => handleUpdateVendor(v.id, "amount", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-2"><Input type="number" min="1" step="1" defaultValue={v.amortizeMonths} onBlur={(e) => handleUpdateVendor(v.id, "amortizeMonths", parseInt(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-2"><Input type="number" step="0.5" defaultValue={v.marginPercent} onBlur={(e) => handleUpdateVendor(v.id, "marginPercent", parseFloat(e.target.value))} className="h-9 text-right tabular-nums" /></TableCell>
                      <TableCell className="p-2 text-right font-mono text-sm text-muted-foreground tabular-nums">{formatCurrency(monthlyCost)}</TableCell>
                      <TableCell className="p-2 text-right font-bold text-primary tabular-nums">{formatCurrency(sellingMonthly)}</TableCell>
                      <TableCell className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVendor(v.id)}><Trash className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!vendorSetupFees?.length && (
                  <TableRow><TableCell colSpan={9} className="h-20 text-center text-muted-foreground">No vendor setup fees yet. Add your first line to amortize one-off costs.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                  <TableHead className="text-right">Monthly cost (SAR)</TableHead>
                  <TableHead className="text-right">Selling / mo</TableHead>
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
                  const cycle = line.billingCycle || "monthly";
                  const engagementMonths = summary?.engagementMonths || 12;
                  const monthlyCost = cycle === "monthly" ? sarAmount : cycle === "annual" ? sarAmount / 12 : sarAmount / Math.max(1, engagementMonths);
                  const sellingMonthly = computeSellingPrice(monthlyCost, line.marginPercent ?? 0);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="p-2"><Input defaultValue={line.name} onBlur={(e) => handleUpdateInfra(line.id, "name", e.target.value)} className="h-9" /></TableCell>
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
                      <TableCell className="p-2 text-right font-mono text-sm text-muted-foreground tabular-nums">{formatCurrency(monthlyCost)}</TableCell>
                      <TableCell className="p-2 text-right font-bold text-primary tabular-nums">{formatCurrency(sellingMonthly)}</TableCell>
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
