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
  useListCtcRules,
  getListCtcRulesQueryKey,
  useListCurrencies,
  getListCurrenciesQueryKey,
  type Employee,
  type Subscription,
  type SalesSupportResource
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash, Save, Calculator, ArrowLeft } from "lucide-react";
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

  const handleUpdateProjectionSettings = (field: string, value: number) => {
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
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-24">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Link href="/projection">
            <Button variant="ghost" size="icon" className="mt-1"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{headerName}</h1>
            <p className="text-muted-foreground mt-1">Manage departmental costs, margins, and client economics</p>
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
              <Card className="border-l-4 border-l-slate-400 dark:border-l-slate-500">
                <CardContent className="pt-5 pb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Department Cost</div>
                  <div className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(totalCostMonthly)}<span className="text-xs font-medium text-muted-foreground ml-1">/ mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">{formatCurrency(totalCostEngagement)} over {engUnit}</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">All team salaries + overheads (what we spend)</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-5 pb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue (Monthly)</div>
                  <div className="mt-2 text-2xl font-bold text-primary tabular-nums">{formatCurrency(summary.sellingPriceWithoutVat * (activeProjection?.numClients || 1))}<span className="text-xs font-medium text-muted-foreground ml-1">/ mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">{formatCurrency(summary.sellingPriceWithoutVat)} × {activeProjection?.numClients} clients</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">Selling price excl. VAT, all clients combined</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-5 pb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue (Engagement)</div>
                  <div className="mt-2 text-2xl font-bold text-primary tabular-nums">{formatCurrency(summary.sellingPriceWithoutVatYearly * (activeProjection?.numClients || 1))}<span className="text-xs font-medium text-muted-foreground ml-1">/ {engUnit}</span></div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">{formatCurrency(summary.sellingPriceWithoutVatYearly)} × {activeProjection?.numClients} clients</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">Selling price excl. VAT over the {engUnit} engagement</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-5 pb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VAT (15%)</div>
                  <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(vatEngagement * (activeProjection?.numClients || 1))}<span className="text-xs font-medium text-muted-foreground ml-1">/ {engUnit}</span></div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">{formatCurrency(vatMonthly * (activeProjection?.numClients || 1))} / month</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">Charge incl. VAT: <span className="tabular-nums font-medium">{formatCurrency(summary.sellingPriceWithVatYearly * (activeProjection?.numClients || 1))}</span> / {engUnit}</div>
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>

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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Department Cost (Team)</CardTitle>
            <CardDescription>Manage your team and their associated costs</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddEmployee}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[150px]">Title</TableHead>
                  <TableHead className="w-[150px]">Country</TableHead>
                  <TableHead className="w-[150px]">Salary (SAR)</TableHead>
                  <TableHead className="w-[100px]">Months</TableHead>
                  <TableHead className="w-[110px] text-right">Alloc %</TableHead>
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Overheads & Subscriptions</CardTitle>
              <CardDescription>Software and operational expenses</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddSubscription}><Plus className="h-4 w-4 mr-2" /> Add Overhead</Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
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
            <div className="rounded-lg border border-primary-foreground/20 overflow-hidden text-sm">
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Sales Support & Managed Services</CardTitle>
            <CardDescription>Add resources specific to client contracts with custom margins</CardDescription>
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddSalesSupport}><Plus className="h-4 w-4 mr-2" /> Add Resource</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Title</TableHead>
                  <TableHead className="w-[140px]">Country</TableHead>
                  <TableHead className="w-[130px] text-right">Salary (SAR)</TableHead>
                  <TableHead className="w-[110px] text-right">CTC (SAR)</TableHead>
                  <TableHead className="w-[90px] text-right">Months</TableHead>
                  <TableHead className="w-[100px] text-right">Alloc %</TableHead>
                  <TableHead className="w-[90px] text-right">Margin %</TableHead>
                  <TableHead className="w-[140px] text-right">Total Cost</TableHead>
                  <TableHead className="w-[140px] text-right">Selling Price</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesSupport?.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="p-2">
                      <Input defaultValue={res.title} onBlur={(e) => handleUpdateSalesSupport(res.id, "title", e.target.value)} className="h-9 border-transparent hover:border-input focus:border-input bg-transparent" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select defaultValue={res.country} onValueChange={(val) => handleUpdateSalesSupport(res.id, "country", val)}>
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
                      <Input type="number" defaultValue={res.salarySar} onBlur={(e) => handleUpdateSalesSupport(res.id, "salarySar", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs p-2 text-muted-foreground">{formatCurrency(res.ctc)}</TableCell>
                    <TableCell className="p-2">
                      <Input type="number" step="0.5" defaultValue={res.months} onBlur={(e) => handleUpdateSalesSupport(res.id, "months", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" min="0" max="100" step="1" defaultValue={res.allocationPercent ?? 100} onBlur={(e) => handleUpdateSalesSupport(res.id, "allocationPercent", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" title="Percentage of time this resource is involved (e.g. 10 = PM at 10%, 100 = full-time)" />
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
    </div>
  );
}
