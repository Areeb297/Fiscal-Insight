import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, Edit2, FileText, MoreHorizontal, Trash } from "lucide-react";
import { 
  useListQuotations, 
  getListQuotationsQueryKey,
  useDeleteQuotation,
  useCreateQuotationFromProjection,
  useListProjections,
  getListProjectionsQueryKey,
  useGetProjectionSummary,
  getGetProjectionSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export default function QuotationsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: quotations, isLoading } = useListQuotations({
    query: { queryKey: getListQuotationsQueryKey() }
  });

  const deleteMutation = useDeleteQuotation();
  const createFromProjection = useCreateQuotationFromProjection();
  const { data: projections } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });

  const [quotationToDelete, setQuotationToDelete] = useState<number | null>(null);
  const [fromProjectionOpen, setFromProjectionOpen] = useState(false);
  const [selectedProjectionId, setSelectedProjectionId] = useState<string>("");

  const projectionIdNum = selectedProjectionId ? parseInt(selectedProjectionId) : 0;
  const { data: previewSummary } = useGetProjectionSummary(projectionIdNum, {
    query: {
      enabled: !!projectionIdNum,
      queryKey: getGetProjectionSummaryQueryKey(projectionIdNum),
    },
  });

  const handleCreateFromProjection = () => {
    if (!projectionIdNum) {
      toast({ title: "Please select a projection", variant: "destructive" });
      return;
    }
    createFromProjection.mutate(
      { projectionId: projectionIdNum },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          toast({ title: "Quotation created from projection" });
          setFromProjectionOpen(false);
          setSelectedProjectionId("");
          setLocation(`/quotations/${result.id}`);
        },
        onError: (e: unknown) => {
          const err = e as { message?: string };
          toast({ title: "Failed to create quotation", description: err?.message ?? "Unknown error", variant: "destructive" });
        },
      },
    );
  };

  const formatSar = (n: number) =>
    new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);

  const handleDelete = () => {
    if (!quotationToDelete) return;
    
    deleteMutation.mutate(
      { id: quotationToDelete },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          toast({ title: "Quotation deleted successfully" });
          setQuotationToDelete(null);
        },
        onError: () => {
          toast({ title: "Failed to delete quotation", variant: "destructive" });
          setQuotationToDelete(null);
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Sent</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Accepted</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground mt-1">Manage client proposals and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/quotations/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Quotation
          </Button>
          <Button onClick={() => setFromProjectionOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" /> New From Projection
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !quotations || quotations.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">No Quotations Found</h3>
              <p className="text-muted-foreground mb-4">Create your first quotation to get started.</p>
              <Button onClick={() => setLocation("/quotations/new")}>Create Quotation</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/quotations/${q.id}`)}>
                    <TableCell className="font-medium">{q.quotationNumber}</TableCell>
                    <TableCell>{q.companyName}</TableCell>
                    <TableCell>{q.clientName}</TableCell>
                    <TableCell>{format(new Date(q.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(q.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/quotations/${q.id}`)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setQuotationToDelete(q.id)}>
                            <Trash className="h-4 w-4 mr-2" /> Delete
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

      <Dialog open={fromProjectionOpen} onOpenChange={(open) => { setFromProjectionOpen(open); if (!open) setSelectedProjectionId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Quotation From Projection</DialogTitle>
            <DialogDescription>
              Pick a saved projection. Line items will be seeded from its computed numbers — you can still edit them after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Projection</label>
              <Select value={selectedProjectionId} onValueChange={setSelectedProjectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a projection..." />
                </SelectTrigger>
                <SelectContent>
                  {(projections ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      Projection {p.yearLabel} — {p.numClients} clients @ {p.marginPercent}% margin
                    </SelectItem>
                  ))}
                  {(!projections || projections.length === 0) && (
                    <SelectItem value="none" disabled>No projections found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {previewSummary && projectionIdNum > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per-client price (monthly, ex VAT):</span>
                  <span className="font-medium tabular-nums">{formatSar(previewSummary.sellingPriceWithoutVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of clients:</span>
                  <span className="font-medium tabular-nums">{previewSummary.projection.numClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales support resources:</span>
                  <span className="font-medium tabular-nums">{previewSummary.salesSupportCount}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFromProjectionOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateFromProjection}
              disabled={!projectionIdNum || createFromProjection.isPending}
            >
              {createFromProjection.isPending ? "Creating..." : "Create Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!quotationToDelete} onOpenChange={(open) => !open && setQuotationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
