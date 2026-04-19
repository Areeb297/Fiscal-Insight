import { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useListProjections,
  getListProjectionsQueryKey,
  generateProjectionInvoices,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, ArrowRight, FileText, Calculator } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";

function thisMonthIso() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function nextMonthIso(month: string) {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: projections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });

  const ranAutoGen = useRef(false);
  useEffect(() => {
    if (ranAutoGen.current || !projections) return;
    const eligible = projections.filter((p) => p.autoGenerateInvoices);
    if (eligible.length === 0) return;
    ranAutoGen.current = true;
    const month = thisMonthIso();
    const lastKey = `invoices:autogen:${month}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(lastKey) === "done") return;
    Promise.all(
      eligible.map((p) =>
        generateProjectionInvoices(p.id, { fromMonth: month, toMonth: nextMonthIso(month) }).catch(() => null),
      ),
    ).then(() => {
      if (typeof window !== "undefined") window.localStorage.setItem(lastKey, "done");
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    });
  }, [projections, queryClient]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(val);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link href="/projection">
            <Button variant="outline"><Calculator className="h-4 w-4 mr-2" /> Open Projection</Button>
          </Link>
          <Link href="/quotations/new">
            <Button><Plus className="h-4 w-4 mr-2" /> New Quotation</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : summary?.recentProjection ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Dept Cost (Engagement)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.totalDeptCostYearly)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.recentProjection.engagementMonths} mo · {formatCurrency(summary.recentProjection.totalDeptCostMonthly)} / mo</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Client (Engagement)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.costPerClientYearly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selling Price (Engagement)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.sellingPriceWithVatYearly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margin (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.marginSarMonthly)}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">No Active Projection</h3>
            <p className="text-muted-foreground mb-4">Create your first projection to see metrics here.</p>
            <Link href="/projection">
              <Button>Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {summary?.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary.charts.costBreakdown && summary.charts.costBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Cost Breakdown</CardTitle>
                <CardDescription>Where your monthly run-rate goes (recent projection)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[260px] w-full"
                  config={{ amount: { label: "SAR / mo", color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
                >
                  <BarChart data={summary.charts.costBreakdown} margin={{ left: 12, right: 12, bottom: 40 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.headcountByCountry && summary.charts.headcountByCountry.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Headcount by Country</CardTitle>
                <CardDescription>Team distribution across regions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[260px] w-full"
                  config={Object.fromEntries(
                    summary.charts.headcountByCountry.map((row, i) => [
                      row.country,
                      { label: row.country, color: `hsl(var(--chart-${(i % 5) + 1}))` },
                    ]),
                  ) satisfies ChartConfig}
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="country" />} />
                    <Pie
                      data={summary.charts.headcountByCountry}
                      dataKey="headcount"
                      nameKey="country"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {summary.charts.headcountByCountry.map((row, i) => (
                        <Cell key={row.country} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="country" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.projectionTrend && summary.charts.projectionTrend.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cost vs Revenue Across Projections</CardTitle>
                <CardDescription>Monthly cost and projected revenue per scenario</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[280px] w-full"
                  config={{
                    monthlyCost: { label: "Monthly Cost", color: "hsl(var(--chart-1))" },
                    monthlyRevenue: { label: "Monthly Revenue", color: "hsl(var(--chart-2))" },
                  } satisfies ChartConfig}
                >
                  <AreaChart data={summary.charts.projectionTrend} margin={{ left: 12, right: 12 }}>
                    <defs>
                      <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-monthlyCost)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--color-monthlyCost)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-monthlyRevenue)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--color-monthlyRevenue)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="monthlyCost" stroke="var(--color-monthlyCost)" fill="url(#fillCost)" strokeWidth={2} />
                    <Area type="monotone" dataKey="monthlyRevenue" stroke="var(--color-monthlyRevenue)" fill="url(#fillRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.projectionTrend && summary.charts.projectionTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Margin Trend</CardTitle>
                <CardDescription>Margin % across projections</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{ marginPercent: { label: "Margin %", color: "hsl(var(--chart-3))" } } satisfies ChartConfig}
                >
                  <LineChart data={summary.charts.projectionTrend} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="marginPercent" stroke="var(--color-marginPercent)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.priceWaterfall && summary.charts.priceWaterfall.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Per-Client Price Waterfall</CardTitle>
                <CardDescription>How each component builds up the monthly price per client</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[260px] w-full"
                  config={{ amount: { label: "SAR / client / mo", color: "hsl(var(--chart-2))" } } satisfies ChartConfig}
                >
                  <BarChart
                    data={summary.charts.priceWaterfall}
                    layout="vertical"
                    margin={{ left: 16, right: 16 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} tickLine={false} axisLine={false} />
                    <YAxis dataKey="component" type="category" tickLine={false} axisLine={false} width={130} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.costAllocationBreakdown && summary.charts.costAllocationBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cost by Allocation Basis</CardTitle>
                <CardDescription>Where each SAR of monthly cost actually sits</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[260px] w-full"
                  config={Object.fromEntries(
                    summary.charts.costAllocationBreakdown.map((row, i) => [
                      row.basis,
                      { label: row.basis, color: `hsl(var(--chart-${(i % 5) + 1}))` },
                    ]),
                  ) satisfies ChartConfig}
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="basis" />} />
                    <Pie
                      data={summary.charts.costAllocationBreakdown}
                      dataKey="amount"
                      nameKey="basis"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {summary.charts.costAllocationBreakdown.map((row, i) => (
                        <Cell key={row.basis} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="basis" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.revenueVsCostByMonth && summary.charts.revenueVsCostByMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Cost (Engagement)</CardTitle>
                <CardDescription>Monthly cost (incl. one-time at M1) vs revenue across the engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[260px] w-full"
                  config={{
                    cost: { label: "Cost", color: "hsl(var(--chart-1))" },
                    revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
                  } satisfies ChartConfig}
                >
                  <AreaChart data={summary.charts.revenueVsCostByMonth} margin={{ left: 12, right: 12 }}>
                    <defs>
                      <linearGradient id="fillEngCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="fillEngRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="cost" stroke="var(--color-cost)" fill="url(#fillEngCost)" strokeWidth={2} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="url(#fillEngRev)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {summary.charts.quotationsByStatus && summary.charts.quotationsByStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quotations by Status</CardTitle>
                <CardDescription>Pipeline mix and totals</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[240px] w-full"
                  config={{ count: { label: "Count", color: "hsl(var(--chart-4))" } } satisfies ChartConfig}
                >
                  <BarChart data={summary.charts.quotationsByStatus} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Quotations</h2>
            <Link href="/quotations">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          <Card>
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : summary?.recentQuotations && summary.recentQuotations.length > 0 ? (
              <div className="divide-y divide-border">
                {summary.recentQuotations.map(q => (
                  <div key={q.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{q.quotationNumber}</div>
                      <div className="text-sm text-muted-foreground">{q.companyName} - {q.clientName}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground hidden sm:block">
                        {format(new Date(q.date), "MMM d, yyyy")}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${q.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                          q.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
                      >
                        {q.status}
                      </span>
                      <Link href={`/quotations/${q.id}`}>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CardContent className="py-8 text-center text-muted-foreground">
                No quotations found.
              </CardContent>
            )}
          </Card>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <Card>
            <CardContent className="p-4 flex flex-col gap-2">
              <Link href="/projection">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <Calculator className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Update Projection</div>
                    <div className="text-xs text-muted-foreground">Modify active cost structures</div>
                  </div>
                </Button>
              </Link>
              <Link href="/quotations/new">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <FileText className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Create Quotation</div>
                    <div className="text-xs text-muted-foreground">Draft a new client proposal</div>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
