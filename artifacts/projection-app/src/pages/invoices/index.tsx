import { useState } from "react";
import { useLocation } from "wouter";
import {
  Eye, Trash, MoreHorizontal, RefreshCw, FileText,
  Calendar as CalendarIcon, ChevronUp, ChevronDown,
  ChevronsUpDown, DollarSign, AlertCircle, Receipt,
} from "lucide-react";
import {
  useListInvoices,
  getListInvoicesQueryKey,
  useDeleteInvoice,
  useUpdateInvoice,
  useGenerateProjectionInvoices,
  useListProjections,
  getListProjectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:   { label: "Draft",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  sent:    { label: "Sent",    className: "bg-blue-50 text-blue-700 border-blue-200" },
  paid:    { label: "Paid",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" },
};

function fmtMoney(n: number, code = "SAR") {
  return new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

function thisMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
}

type SortKey = "dueDate" | "issueDate" | "billingMonth" | "client" | "amount";

// ── sub-components ─────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "red" | "emerald" | "blue";
}) {
  const iconColor = accent === "red" ? "text-red-500 bg-red-50" :
    accent === "emerald" ? "text-emerald-600 bg-emerald-50" :
    "text-primary bg-primary/8";
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
            <p className={cn(
              "text-lg sm:text-2xl font-bold tabular-nums leading-none",
              accent === "red" ? "text-red-600" : accent === "emerald" ? "text-emerald-600" : "text-foreground"
            )}>
              {value}
            </p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortHead({
  label, sortKey: k, currentKey, dir, onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === k;
  return (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap", className)}
      onClick={() => onSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
          : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />}
      </span>
    </TableHead>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function InvoicesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectionFilter, setProjectionFilter] = useState<number | undefined>(undefined);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [genProjId, setGenProjId] = useState<number | undefined>(undefined);
  const [fromMonthVal, setFromMonthVal] = useState(() => thisMonth());
  const [toMonthVal, setToMonthVal] = useState(() => nextMonth(thisMonth()));

  const params: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "all") params.status = statusFilter;
  if (projectionFilter) params.projectionId = projectionFilter;

  const { data: invoices, isLoading } = useListInvoices(params, {
    query: { queryKey: getListInvoicesQueryKey(params) },
  });
  const { data: projections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });

  const deleteMut = useDeleteInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        toast({ title: "Invoice deleted" });
      },
    },
  });
  const updateMut = useUpdateInvoice({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
    },
  });
  const genMut = useGenerateProjectionInvoices({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        toast({
          title: "Invoices generated",
          description: `${res.created} created · ${res.updated} updated · ${res.skipped} skipped`,
        });
      },
      onError: (e: unknown) => {
        toast({ title: "Generation failed", description: String(e), variant: "destructive" });
      },
    },
  });

  const clientOptions = Array.from(new Set((invoices ?? []).map((i) => i.clientName))).sort();
  const filtered = (invoices ?? []).filter((i) => clientFilter === "all" || i.clientName === clientFilter);
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (inv: typeof a): string | number => {
      switch (sortKey) {
        case "client": return inv.clientName;
        case "amount": return inv.grandTotal ?? 0;
        case "issueDate": return inv.issueDate;
        case "billingMonth": return inv.billingMonth;
        default: return inv.dueDate;
      }
    };
    const av = get(a); const bv = get(b);
    return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
  });

  const grandTotal    = filtered.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const outstanding   = filtered.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const overdueCount  = filtered.filter((i) => i.status === "overdue").length;
  const paidCount     = filtered.filter((i) => i.status === "paid").length;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  // Determine first billing month per (projectionId, clientKey) → "Setup" badge
  const firstMonthMap = new Map<string, string>();
  for (const inv of sorted) {
    const key = `${inv.projectionId}-${inv.clientKey}`;
    if (!firstMonthMap.has(key) || inv.billingMonth < firstMonthMap.get(key)!) {
      firstMonthMap.set(key, inv.billingMonth);
    }
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and generate client invoices.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/invoices/calendar")}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          Payment Calendar
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-4 sm:flex-wrap">
        <MetricCard
          label="Total Billed"
          value={`SAR ${fmtMoney(grandTotal)}`}
          sub={`${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`}
          icon={DollarSign}
        />
        <MetricCard
          label="Outstanding"
          value={`SAR ${fmtMoney(outstanding)}`}
          sub={`${filtered.length - paidCount} unpaid`}
          icon={Receipt}
          accent="blue"
        />
        <MetricCard
          label="Overdue"
          value={String(overdueCount)}
          sub={overdueCount === 0 ? "All on time" : "Needs attention"}
          icon={AlertCircle}
          accent={overdueCount > 0 ? "red" : undefined}
        />
      </div>

      {/* ── Generate invoices ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Generate monthly invoices</CardTitle>
          <p className="text-xs text-muted-foreground">Select a projection and date range, then generate invoices for all clients.</p>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Projection</label>
              <Select value={genProjId ? String(genProjId) : ""} onValueChange={(v) => setGenProjId(Number(v))}>
                <SelectTrigger className="h-9 w-60 text-sm">
                  <SelectValue placeholder="Select projection" />
                </SelectTrigger>
                <SelectContent>
                  {(projections ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name ?? `Projection ${p.id}`}
                      <span className="ml-1.5 text-muted-foreground">({p.yearLabel})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input
                type="month"
                value={fromMonthVal}
                onChange={(e) => setFromMonthVal(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                type="month"
                value={toMonthVal}
                onChange={(e) => setToMonthVal(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button
              size="sm"
              disabled={!genProjId || !fromMonthVal || !toMonthVal || genMut.isPending}
              onClick={() => {
                if (!genProjId) return;
                if (toMonthVal < fromMonthVal) {
                  toast({ title: "Invalid range", description: "To-month must be on or after from-month.", variant: "destructive" });
                  return;
                }
                genMut.mutate({ id: genProjId, data: { fromMonth: fromMonthVal, toMonth: toMonthVal } });
              }}
              className="h-9"
            >
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", genMut.isPending && "animate-spin")} />
              {genMut.isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">All Invoices</CardTitle>
              {sorted.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{sorted.length} invoice{sorted.length !== 1 ? "s" : ""} shown</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={projectionFilter ? String(projectionFilter) : "all"}
                onValueChange={(v) => setProjectionFilter(v === "all" ? undefined : Number(v))}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All projections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projections</SelectItem>
                  {(projections ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name ?? `Projection ${p.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate invoices from a projection above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6 w-36">Invoice #</TableHead>
                    <SortHead label="Client"  sortKey="client"       currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortHead label="Month"   sortKey="billingMonth" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                    <SortHead label="Issued"  sortKey="issueDate"    currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                    <SortHead label="Due"     sortKey="dueDate"      currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                    <TableHead>Status</TableHead>
                    <SortHead label="Total"   sortKey="amount"       currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="text-right pr-6" />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((inv) => {
                    const key = `${inv.projectionId}-${inv.clientKey}`;
                    const isSetup = firstMonthMap.get(key) === inv.billingMonth;
                    const statusCfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;

                    return (
                      <TableRow
                        key={inv.id}
                        className="cursor-pointer group"
                        onClick={() => setLocation(`/invoices/${inv.id}`)}
                      >
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{inv.clientName}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-sm">{inv.billingMonth}</span>
                            <span className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border",
                              isSetup
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            )}>
                              {isSetup ? "Setup" : "Recurring"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell tabular-nums text-sm text-muted-foreground">{inv.issueDate}</TableCell>
                        <TableCell className="hidden md:table-cell tabular-nums text-sm text-muted-foreground">{inv.dueDate}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={inv.status}
                            onValueChange={(v) => updateMut.mutate({ id: inv.id, data: { status: v as "draft" | "sent" | "paid" | "overdue" } })}
                          >
                            <SelectTrigger className="h-7 w-auto border-0 px-2 shadow-none focus:ring-0 hover:bg-muted rounded-md">
                              <span className={cn(
                                "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border",
                                statusCfg.className
                              )}>
                                {statusCfg.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-sm pr-6">
                          <span className="text-muted-foreground text-xs font-normal mr-1">{inv.currencyCode ?? "SAR"}</span>
                          {fmtMoney(inv.grandTotal)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()} className="pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/invoices/${inv.id}`)}>
                                <Eye className="mr-2 h-3.5 w-3.5" /> View / Print
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteId(inv.id)}
                              >
                                <Trash className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete confirm ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId !== null) deleteMut.mutate({ id: deleteId }); setDeleteId(null); }}
            >
              Delete invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
