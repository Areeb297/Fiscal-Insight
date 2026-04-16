import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { 
  useGetQuotation, 
  getGetQuotationQueryKey,
  useCreateQuotation,
  useUpdateQuotation,
  useCreateQuotationLineItem,
  useUpdateQuotationLineItem,
  useDeleteQuotationLineItem,
  useListProjections,
  getListProjectionsQueryKey,
  useGetSystemSettings,
  getGetSystemSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash, Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { z } from "zod";

export default function QuotationForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = !params.id || params.id === "new";
  const quotationId = isNew ? 0 : parseInt(params.id as string);

  const { data: quotation, isLoading: isLoadingQuotation } = useGetQuotation(quotationId, {
    query: { enabled: !isNew && !!quotationId, queryKey: getGetQuotationQueryKey(quotationId) }
  });

  const { data: projections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() }
  });

  const { data: settings } = useGetSystemSettings({
    query: { queryKey: getGetSystemSettingsQueryKey() }
  });

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const createLineItem = useCreateQuotationLineItem();
  const updateLineItem = useUpdateQuotationLineItem();
  const deleteLineItem = useDeleteQuotationLineItem();

  const [headerData, setHeaderData] = useState({
    quotationNumber: "",
    companyName: "",
    clientName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "draft",
    projectionId: ""
  });

  useEffect(() => {
    if (isNew && settings) {
      setHeaderData(prev => ({
        ...prev,
        quotationNumber: `${settings.quotationPrefix}-${format(new Date(), "yyyyMMdd")}-01`,
        companyName: settings.companyName
      }));
    }
  }, [isNew, settings]);

  useEffect(() => {
    if (quotation && !isNew) {
      setHeaderData({
        quotationNumber: quotation.quotationNumber,
        companyName: quotation.companyName,
        clientName: quotation.clientName,
        date: format(new Date(quotation.date), "yyyy-MM-dd"),
        status: quotation.status,
        projectionId: quotation.projectionId ? quotation.projectionId.toString() : ""
      });
    }
  }, [quotation, isNew]);

  const handleHeaderChange = (field: string, value: string) => {
    setHeaderData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveHeader = async () => {
    const projectionIdParsed =
      headerData.projectionId && headerData.projectionId !== "none"
        ? parseInt(headerData.projectionId)
        : undefined;

    const payload = {
      quotationNumber: headerData.quotationNumber || `QT-${format(new Date(), "yyyyMMdd")}-01`,
      companyName: headerData.companyName || "Your Company",
      clientName: headerData.clientName || "Client Name",
      date: headerData.date,
      status: headerData.status,
      projectionId: Number.isFinite(projectionIdParsed) ? projectionIdParsed : undefined,
    };

    try {
      if (isNew) {
        const result = await createQuotation.mutateAsync({ data: payload });
        queryClient.invalidateQueries({ queryKey: getListProjectionsQueryKey() });
        toast({ title: "Quotation created" });
        setLocation(`/quotations/${result.id}`);
      } else {
        await updateQuotation.mutateAsync({ id: quotationId, data: payload });
        queryClient.invalidateQueries({ queryKey: getGetQuotationQueryKey(quotationId) });
        toast({ title: "Quotation updated" });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string } | undefined;
      const msg = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      toast({ title: "Failed to save quotation", description: msg, variant: "destructive" });
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleAddLineItem = () => {
    if (isNew) {
      toast({ title: "Please save the quotation first before adding items", variant: "destructive" });
      return;
    }
    
    createLineItem.mutate(
      { 
        quotationId, 
        data: { 
          description: "New Item", 
          quantity: 1, 
          unit: "month", 
          priceMonthly: 0, 
          totalMonths: 12,
          sortOrder: (quotation?.lineItems?.length || 0) + 1
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuotationQueryKey(quotationId) });
        }
      }
    );
  };

  const handleUpdateLineItem = (id: number, field: string, value: any) => {
    updateLineItem.mutate(
      { quotationId, id, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuotationQueryKey(quotationId) });
        }
      }
    );
  };

  const handleDeleteLineItem = (id: number) => {
    deleteLineItem.mutate(
      { quotationId, id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuotationQueryKey(quotationId) });
        }
      }
    );
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(val);

  if (!isNew && isLoadingQuotation) {
    return <div className="p-8"><Skeleton className="h-[600px] w-full" /></div>;
  }

  const calculateTotals = () => {
    if (!quotation?.lineItems) return { subtotal: 0, vat: 0, total: 0 };
    
    const subtotal = quotation.lineItems.reduce((acc, item) => {
      return acc + (item.quantity * item.priceMonthly * item.totalMonths);
    }, 0);
    
    const vatRate = settings?.vatRate || 15;
    const vat = subtotal * (vatRate / 100);
    const total = subtotal + vat;
    
    return { subtotal, vat, total, vatRate };
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/quotations")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "New Quotation" : "Edit Quotation"}</h1>
          <p className="text-muted-foreground mt-1">{isNew ? "Draft a new proposal" : headerData.quotationNumber}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quotation Number</Label>
              <Input 
                value={headerData.quotationNumber} 
                onChange={(e) => handleHeaderChange("quotationNumber", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={headerData.date} 
                onChange={(e) => handleHeaderChange("date", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={headerData.companyName} 
                onChange={(e) => handleHeaderChange("companyName", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input 
                value={headerData.clientName} 
                onChange={(e) => handleHeaderChange("clientName", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={headerData.status} onValueChange={(val) => handleHeaderChange("status", val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to Projection (Optional)</Label>
              <Select value={headerData.projectionId} onValueChange={(val) => handleHeaderChange("projectionId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select projection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projections?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>Projection {p.yearLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t p-4 bg-muted/20">
          <Button variant="outline" onClick={() => handleSaveHeader()}>
            <Save className="h-4 w-4 mr-2" /> Save Details
          </Button>
          {!isNew && (
            <Button variant="default" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          )}
        </CardFooter>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={handleAddLineItem}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Description</TableHead>
                    <TableHead className="w-[100px] text-right">Qty</TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead className="w-[150px] text-right">Price/Unit</TableHead>
                    <TableHead className="w-[100px] text-right">Months</TableHead>
                    <TableHead className="w-[150px] text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation?.lineItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="p-2">
                        <Input 
                          defaultValue={item.description} 
                          onBlur={(e) => handleUpdateLineItem(item.id, "description", e.target.value)} 
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          defaultValue={item.quantity} 
                          onBlur={(e) => handleUpdateLineItem(item.id, "quantity", parseFloat(e.target.value))} 
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          defaultValue={item.unit} 
                          onBlur={(e) => handleUpdateLineItem(item.id, "unit", e.target.value)} 
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          defaultValue={item.priceMonthly} 
                          onBlur={(e) => handleUpdateLineItem(item.id, "priceMonthly", parseFloat(e.target.value))} 
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" 
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          type="number" 
                          defaultValue={item.totalMonths} 
                          onBlur={(e) => handleUpdateLineItem(item.id, "totalMonths", parseFloat(e.target.value))} 
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" 
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium p-2">
                        {formatCurrency(item.quantity * item.priceMonthly * item.totalMonths)}
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteLineItem(item.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!quotation?.lineItems?.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No line items added.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {quotation?.lineItems && quotation.lineItems.length > 0 && (
              <div className="flex justify-end mt-6">
                <div className="w-[300px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({totals.vatRate}%):</span>
                    <span className="font-medium">{formatCurrency(totals.vat)}</span>
                  </div>
                  <div className="h-px bg-border my-2"></div>
                  <div className="flex justify-between text-base font-bold text-primary">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
