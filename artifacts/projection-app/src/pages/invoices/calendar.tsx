import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import {
  useGetInvoiceCalendar,
  getGetInvoiceCalendarQueryKey,
  useListProjections,
  getListProjectionsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StatusKey = "draft" | "sent" | "paid" | "overdue";

type CalendarInvoice = {
  id: number;
  invoiceNumber: string;
  clientName: string;
  status: string;
  dueDate: string;
  grandTotal: number;
};

type CalendarCellData = {
  month: string;
  invoiceCount: number;
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  statusCounts: Record<StatusKey, number>;
  invoices: CalendarInvoice[];
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-200 text-blue-900",
  paid: "bg-green-200 text-green-900",
  overdue: "bg-red-200 text-red-900",
};

function fmtMoney(n: number) {
  return `SAR ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthLabel(m: string) {
  const [y, mn] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mn - 1, 1)).toLocaleString(undefined, { month: "short", year: "numeric" });
}

export default function PaymentCalendar() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState<number>(() => new Date().getUTCFullYear());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectionFilter, setProjectionFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const params: Record<string, unknown> = { from: `${year}-01`, to: `${year}-12` };
  if (projectionFilter !== "all") params.projectionId = Number(projectionFilter);
  const { data, isLoading } = useGetInvoiceCalendar(params, {
    query: { queryKey: getGetInvoiceCalendarQueryKey(params) },
  });
  const { data: projections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });

  const filterInvoice = (inv: CalendarInvoice) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (clientFilter !== "all" && inv.clientName !== clientFilter) return false;
    return true;
  };

  const allClientNames = useMemo(() => {
    const set = new Set<string>();
    for (const c of (data?.months ?? [])) for (const inv of c.invoices) set.add(inv.clientName);
    return Array.from(set).sort();
  }, [data]);

  const months = useMemo(() => {
    const all: Array<{ month: string; cell: CalendarCellData | null }> = [];
    for (let m = 1; m <= 12; m += 1) {
      const key = `${year}-${String(m).padStart(2, "0")}`;
      const raw = (data?.months ?? []).find((c) => c.month === key) ?? null;
      if (!raw) { all.push({ month: key, cell: null }); continue; }
      const filteredInvoices = raw.invoices.filter(filterInvoice);
      if (filteredInvoices.length === 0 && (statusFilter !== "all" || clientFilter !== "all")) {
        all.push({ month: key, cell: null }); continue;
      }
      const totalDue = filteredInvoices.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
      const totalPaid = filteredInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.grandTotal ?? 0), 0);
      const statusCounts: Record<StatusKey, number> = { draft: 0, sent: 0, paid: 0, overdue: 0 };
      for (const i of filteredInvoices) if (i.status in statusCounts) statusCounts[i.status as StatusKey] += 1;
      all.push({
        month: key,
        cell: {
          month: key,
          invoiceCount: filteredInvoices.length,
          totalDue,
          totalPaid,
          totalOutstanding: totalDue - totalPaid,
          statusCounts,
          invoices: filteredInvoices,
        },
      });
    }
    return all;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, year, statusFilter, clientFilter]);

  const flatInvoices: Array<CalendarInvoice & { month: string }> = useMemo(() => {
    const out: Array<CalendarInvoice & { month: string }> = [];
    for (const c of (data?.months ?? [])) for (const inv of c.invoices) {
      if (filterInvoice(inv)) out.push({ ...inv, month: c.month });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, statusFilter, clientFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const groups = useMemo(() => {
    const upcoming: typeof flatInvoices = [];
    const overdue: typeof flatInvoices = [];
    const paid: typeof flatInvoices = [];
    for (const inv of flatInvoices) {
      if (inv.status === "paid") paid.push(inv);
      else if (inv.status === "overdue" || (inv.status !== "paid" && inv.dueDate < today)) overdue.push(inv);
      else upcoming.push(inv);
    }
    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    paid.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    return { upcoming, overdue, paid };
  }, [flatInvoices, today]);

  const totals = useMemo(() => {
    const totalDue = flatInvoices.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
    const totalPaid = flatInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.grandTotal ?? 0), 0);
    return { invoiceCount: flatInvoices.length, totalDue, totalPaid, totalOutstanding: totalDue - totalPaid };
  }, [flatInvoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setLocation("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Invoices
          </Button>
          <h1 className="text-3xl font-bold">Payment Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>‹</Button>
          <div className="w-16 text-center font-medium">{year}</div>
          <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>›</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectionFilter} onValueChange={setProjectionFilter}>
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
            {allClientNames.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Invoices</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{totals.invoiceCount}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{fmtMoney(totals.totalDue)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-700">{fmtMoney(totals.totalPaid)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-700">{fmtMoney(totals.totalOutstanding)}</div></CardContent></Card>
          </div>

          <Tabs defaultValue="grid">
            <TabsList>
              <TabsTrigger value="grid">Month Grid</TabsTrigger>
              <TabsTrigger value="list">Upcoming · Overdue · Paid</TabsTrigger>
            </TabsList>
            <TabsContent value="grid">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {months.map(({ month, cell }) => (
                  <Card key={month} className={cell ? "" : "opacity-60"}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{monthLabel(month)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Invoices</span><span>{cell?.invoiceCount ?? 0}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{fmtMoney(cell?.totalDue ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-700">{fmtMoney(cell?.totalPaid ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="text-orange-700">{fmtMoney(cell?.totalOutstanding ?? 0)}</span></div>
                      {cell ? (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {(["draft","sent","paid","overdue"] as const).map((s) =>
                            cell.statusCounts[s] > 0 ? (
                              <Badge key={s} className={statusColors[s]}>{cell.statusCounts[s]} {s}</Badge>
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="list">
              <div className="grid gap-4 lg:grid-cols-3">
                <GroupColumn title="Overdue" tone="text-red-700" rows={groups.overdue} onOpen={(id) => setLocation(`/invoices/${id}`)} />
                <GroupColumn title="Upcoming" tone="text-blue-700" rows={groups.upcoming} onOpen={(id) => setLocation(`/invoices/${id}`)} />
                <GroupColumn title="Paid" tone="text-green-700" rows={groups.paid} onOpen={(id) => setLocation(`/invoices/${id}`)} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function GroupColumn({
  title, tone, rows, onOpen,
}: {
  title: string; tone: string;
  rows: Array<CalendarInvoice & { month: string }>;
  onOpen: (id: number) => void;
}) {
  const total = rows.reduce((s, i) => s + (i.grandTotal ?? 0), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${tone}`}>{title} ({rows.length})</CardTitle>
        <div className="text-xs text-muted-foreground">{fmtMoney(total)}</div>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">None</div>
        ) : rows.map((inv) => (
          <div
            key={inv.id}
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
            onClick={() => onOpen(inv.id)}
          >
            <div className="flex flex-col">
              <span className="font-mono text-xs">{inv.invoiceNumber}</span>
              <span className="text-muted-foreground text-xs">{inv.clientName} · due {inv.dueDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[inv.status]}>{inv.status}</Badge>
              <span className="font-medium">{fmtMoney(inv.grandTotal)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
