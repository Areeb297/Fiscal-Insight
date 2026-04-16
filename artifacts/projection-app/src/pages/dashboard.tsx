import { Link } from "wouter";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Plus, ArrowRight, FileText, Calculator } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(val);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-3">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Dept Cost (Yearly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.totalDeptCostYearly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Client (Yearly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.recentProjection.costPerClientYearly)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selling Price (Yearly)</CardTitle>
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
