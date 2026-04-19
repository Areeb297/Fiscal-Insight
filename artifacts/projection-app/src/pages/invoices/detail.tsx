import { useRoute, useLocation } from "wouter";
import { Printer, ArrowLeft, Trash, Plus } from "lucide-react";
import {
  useGetInvoice,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
  useUpdateInvoice,
  useCreateInvoiceLineItem,
  useUpdateInvoiceLineItem,
  useDeleteInvoiceLineItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-200 text-blue-900",
  paid: "bg-green-200 text-green-900",
  overdue: "bg-red-200 text-red-900",
};

function fmtMoney(n: number, code = "SAR") {
  return `${code} ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = params ? Number(params.id) : 0;

  const { data: inv, isLoading } = useGetInvoice(id, {
    query: { queryKey: getGetInvoiceQueryKey(id), enabled: id > 0 },
  });
  const inval = () => {
    qc.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
  };

  const upd = useUpdateInvoice({ mutation: { onSuccess: inval } });
  const addLine = useCreateInvoiceLineItem({ mutation: { onSuccess: inval } });
  const updLine = useUpdateInvoiceLineItem({ mutation: { onSuccess: inval } });
  const delLine = useDeleteInvoiceLineItem({ mutation: { onSuccess: inval } });

  const numEdit = (
    li: { id: number; quantity: number; unitPrice: number; marginPercent: number; vatRate: number },
    field: "quantity" | "unitPrice" | "marginPercent" | "vatRate",
    raw: string,
  ) => {
    const value = Number(raw);
    if (Number.isNaN(value) || value === li[field]) return;
    updLine.mutate({ invoiceId: id, id: li.id, data: { [field]: value } });
  };

  if (isLoading || !inv) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Select value={inv.status} onValueChange={(v) => upd.mutate({ id, data: { status: v as "draft"|"sent"|"paid"|"overdue" } })}>
            <SelectTrigger className="w-32"><Badge className={statusColors[inv.status]}>{inv.status}</Badge></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{inv.companyName}</CardTitle>
              <p className="text-sm text-muted-foreground">Invoice</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg">{inv.invoiceNumber}</div>
              <div className="text-sm text-muted-foreground">Issued: {inv.issueDate}</div>
              <div className="text-sm text-muted-foreground">Due: {inv.dueDate}</div>
              <div className="mt-1"><Badge className={statusColors[inv.status]}>{inv.status}</Badge></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Bill To (client name)</Label>
              <Input
                key={`cn-${inv.id}`}
                defaultValue={inv.clientName}
                className="print:border-0 print:p-0 print:shadow-none"
                onBlur={(e) => { if (e.target.value !== inv.clientName) upd.mutate({ id, data: { clientName: e.target.value } }); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Company</Label>
              <Input
                key={`co-${inv.id}`}
                defaultValue={inv.companyName}
                className="print:border-0 print:p-0 print:shadow-none"
                onBlur={(e) => { if (e.target.value !== inv.companyName) upd.mutate({ id, data: { companyName: e.target.value } }); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Issue date</Label>
              <Input
                type="date"
                key={`is-${inv.id}`}
                defaultValue={inv.issueDate}
                className="print:border-0 print:p-0 print:shadow-none"
                onBlur={(e) => { if (e.target.value && e.target.value !== inv.issueDate) upd.mutate({ id, data: { issueDate: e.target.value } }); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Due date</Label>
              <Input
                type="date"
                key={`du-${inv.id}`}
                defaultValue={inv.dueDate}
                className="print:border-0 print:p-0 print:shadow-none"
                onBlur={(e) => { if (e.target.value && e.target.value !== inv.dueDate) upd.mutate({ id, data: { dueDate: e.target.value } }); }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Billing month</Label>
              <div className="font-medium pt-2">{inv.billingMonth}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">VAT rate</Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                key={`vr-${inv.id}`}
                defaultValue={inv.vatRate > 1 ? inv.vatRate : inv.vatRate * 100}
                className="print:border-0 print:p-0 print:shadow-none"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v / 100 !== inv.vatRate && v !== inv.vatRate) {
                    upd.mutate({ id, data: { vatRate: v > 1 ? v / 100 : v } });
                  }
                }}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-32 text-right">Unit Price</TableHead>
                <TableHead className="w-24 text-right">Margin %</TableHead>
                <TableHead className="w-32 text-right">Subtotal</TableHead>
                <TableHead className="w-32 text-right">Total (incl. VAT)</TableHead>
                <TableHead className="w-12 print:hidden"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>
                    <Input
                      defaultValue={li.description}
                      className="border-0 p-1 print:p-0"
                      onBlur={(e) => {
                        if (e.target.value !== li.description) {
                          updLine.mutate({ invoiceId: id, id: li.id, data: { description: e.target.value } });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number" step="0.01" defaultValue={li.quantity}
                      className="h-8 w-20 border-0 p-1 text-right print:p-0"
                      onBlur={(e) => numEdit(li, "quantity", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number" step="0.01" defaultValue={li.unitPrice}
                      className="h-8 w-28 border-0 p-1 text-right print:p-0"
                      onBlur={(e) => numEdit(li, "unitPrice", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number" step="0.5" min="0" max="100" defaultValue={li.marginPercent}
                      className="h-8 w-20 border-0 p-1 text-right print:p-0"
                      onBlur={(e) => numEdit(li, "marginPercent", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">{fmtMoney(li.lineSubtotal, inv.currencyCode)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(li.lineTotal, inv.currencyCode)}</TableCell>
                  <TableCell className="print:hidden">
                    <Button variant="ghost" size="icon" onClick={() => delLine.mutate({ invoiceId: id, id: li.id })}>
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addLine.mutate({ invoiceId: id, data: { description: "New item", quantity: 1, unitPrice: 0, marginPercent: 0, vatRate: inv.vatRate } })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Line
            </Button>
          </div>

          <div className="ml-auto w-72 space-y-2 border-t pt-4">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(inv.subtotal, inv.currencyCode)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT ({Math.round((inv.vatRate > 1 ? inv.vatRate : inv.vatRate * 100))}%)</span><span>{fmtMoney(inv.vatTotal, inv.currencyCode)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>{fmtMoney(inv.grandTotal, inv.currencyCode)}</span></div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
            <Textarea
              key={`no-${inv.id}`}
              defaultValue={inv.notes ?? ""}
              placeholder="Add invoice notes…"
              className="min-h-[80px] print:border-0 print:bg-transparent"
              onBlur={(e) => {
                const v = e.target.value;
                if ((v || null) !== (inv.notes ?? null)) upd.mutate({ id, data: { notes: v || null } });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
