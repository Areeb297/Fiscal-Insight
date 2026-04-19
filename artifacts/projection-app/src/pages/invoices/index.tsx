import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, Trash, MoreHorizontal, RefreshCw, FileText, Calendar as CalendarIcon } from "lucide-react";
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

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-200 text-blue-900",
  paid: "bg-green-200 text-green-900",
  overdue: "bg-red-200 text-red-900",
};

function fmtMoney(n: number, code = "SAR") {
  return `${code} ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function thisMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

type SortKey = "dueDate" | "issueDate" | "billingMonth" | "client" | "amount";

export default function InvoicesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [projectionFilter, setProjectionFilter] = useState<number | undefined>(undefined);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [genProjId, setGenProjId] = useState<number | undefined>(undefined);
  const [fromMonthVal, setFromMonthVal] = useState<string>(() => thisMonth());
  const [toMonthVal, setToMonthVal] = useState<string>(() => nextMonth(thisMonth()));

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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      },
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
        case "dueDate":
        default: return inv.dueDate;
      }
    };
    const av = get(a); const bv = get(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  const grandTotal = filtered.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const outstanding = filtered
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  const overdueCount = filtered.filter((i) => i.status === "overdue").length;
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sortIcon = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Auto-generated recurring monthly invoices.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/invoices/calendar")}>
            <CalendarIcon className="mr-2 h-4 w-4" /> Payment Calendar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Billed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtMoney(grandTotal)}</div></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtMoney(outstanding)}</div></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{overdueCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate monthly invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Projection</label>
            <Select value={genProjId ? String(genProjId) : ""} onValueChange={(v) => setGenProjId(Number(v))}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select projection" /></SelectTrigger>
              <SelectContent>
                {(projections ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name ?? `Projection ${p.id}`} ({p.yearLabel})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">From (YYYY-MM)</label>
            <input
              type="month"
              value={fromMonthVal}
              onChange={(e) => setFromMonthVal(e.target.value)}
              className="block h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To (YYYY-MM)</label>
            <input
              type="month"
              value={toMonthVal}
              onChange={(e) => setToMonthVal(e.target.value)}
              className="block h-10 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <Button
            disabled={!genProjId || !fromMonthVal || !toMonthVal || genMut.isPending}
            onClick={() => {
              if (!genProjId) return;
              if (toMonthVal < fromMonthVal) {
                toast({ title: "Invalid range", description: "To-month must be on or after from-month.", variant: "destructive" });
                return;
              }
              genMut.mutate({ id: genProjId, data: { fromMonth: fromMonthVal, toMonth: toMonthVal } });
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${genMut.isPending ? "animate-spin" : ""}`} />
            Generate range
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Invoices</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
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
              <SelectTrigger className="w-48"><SelectValue placeholder="Projection" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projections</SelectItem>
                {(projections ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name ?? `Projection ${p.id}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clientOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No invoices yet. Generate them from a projection above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("client")}>Client{sortIcon("client")}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("billingMonth")}>Month{sortIcon("billingMonth")}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("issueDate")}>Issue{sortIcon("issueDate")}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dueDate")}>Due{sortIcon("dueDate")}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("amount")}>Total{sortIcon("amount")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                    <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.clientName}</TableCell>
                    <TableCell>{inv.billingMonth}</TableCell>
                    <TableCell>{inv.issueDate}</TableCell>
                    <TableCell>{inv.dueDate}</TableCell>
                    <TableCell>
                      <Select
                        value={inv.status}
                        onValueChange={(v) => updateMut.mutate({ id: inv.id, data: { status: v as "draft"|"sent"|"paid"|"overdue" } })}
                      >
                        <SelectTrigger className="h-8 w-28" onClick={(e) => e.stopPropagation()}>
                          <Badge className={statusColors[inv.status]}>{inv.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">{fmtMoney(inv.grandTotal, inv.currencyCode)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/invoices/${inv.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> View / Print
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(inv.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId !== null) deleteMut.mutate({ id: deleteId });
                setDeleteId(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
