import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListProjections,
  getListProjectionsQueryKey,
  useCreateProjection,
  useUpdateProjection,
  useDeleteProjection,
  type Projection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash, Pencil, Calculator, ArrowRight, Calendar, Users, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectionsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: projections, isLoading } = useListProjections({
    query: { queryKey: getListProjectionsQueryKey() },
  });

  const createProjection = useCreateProjection();
  const updateProjection = useUpdateProjection();
  const deleteProjection = useDeleteProjection();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Projection | null>(null);
  const [form, setForm] = useState({
    name: "",
    yearLabel: new Date().getFullYear().toString(),
    sarRate: 3.75,
    numClients: 1,
    marginPercent: 0.30,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListProjectionsQueryKey() });

  const handleCreate = async () => {
    try {
      const result = await createProjection.mutateAsync({
        data: {
          name: form.name.trim() || null,
          yearLabel: form.yearLabel || new Date().getFullYear().toString(),
          sarRate: form.sarRate,
          numClients: form.numClients,
          marginPercent: form.marginPercent,
        },
      });
      refresh();
      setCreateOpen(false);
      setForm({ name: "", yearLabel: new Date().getFullYear().toString(), sarRate: 3.75, numClients: 1, marginPercent: 0.30 });
      toast({ title: "Projection created" });
      setLocation(`/projection/${result.id}`);
    } catch (e: unknown) {
      const err = e as { message?: string } | undefined;
      toast({ title: "Failed to create", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    try {
      await updateProjection.mutateAsync({ id: renameTarget.id, data: { name: form.name.trim() || null } });
      refresh();
      setRenameTarget(null);
      toast({ title: "Projection renamed" });
    } catch (e: unknown) {
      const err = e as { message?: string } | undefined;
      toast({ title: "Failed to rename", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProjection.mutateAsync({ id });
      refresh();
      toast({ title: "Projection deleted" });
    } catch (e: unknown) {
      const err = e as { message?: string } | undefined;
      toast({ title: "Failed to delete", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projections</h1>
          <p className="text-muted-foreground mt-1">Save and manage multiple departmental cost projections</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg"><Plus className="h-4 w-4 mr-2" /> New Projection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Projection</DialogTitle>
              <DialogDescription>Give your projection a name so you can find it later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ebttikar 2026 Plan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input value={form.yearLabel} onChange={(e) => setForm((f) => ({ ...f, yearLabel: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>SAR Exchange Rate</Label>
                  <Input type="number" step="0.01" value={form.sarRate} onChange={(e) => setForm((f) => ({ ...f, sarRate: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Clients</Label>
                  <Input type="number" min="1" value={form.numClients} onChange={(e) => setForm((f) => ({ ...f, numClients: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Margin (decimal, e.g. 0.30)</Label>
                  <Input type="number" step="0.01" value={form.marginPercent} onChange={(e) => setForm((f) => ({ ...f, marginPercent: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createProjection.isPending}>
                {createProjection.isPending ? "Creating..." : "Create & Open"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : !projections?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mb-3 opacity-60" />
            <h3 className="text-lg font-semibold">No projections yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create your first projection to start tracking team costs, overheads, and per-client economics.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create First Projection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projections.map((p) => (
            <Card key={p.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-start justify-between gap-2">
                  <span className="truncate">{p.name?.trim() || `Projection ${p.yearLabel}`}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" /> {p.yearLabel}
                  <span className="mx-1.5">·</span>
                  <Users className="h-3 w-3" /> {p.numClients} clients
                  <span className="mx-1.5">·</span>
                  <Percent className="h-3 w-3" /> {Math.round((p.marginPercent > 1 ? p.marginPercent : p.marginPercent * 100))}% margin
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-xs text-muted-foreground space-y-1">
                <div>Created {new Date(p.createdAt).toLocaleDateString()}</div>
                <div>Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
              </CardContent>
              <CardFooter className="flex justify-between items-center gap-2 border-t bg-muted/20 p-3">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRenameTarget(p);
                      setForm((f) => ({ ...f, name: p.name ?? "" }));
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Rename
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this projection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the projection "{p.name?.trim() || `Projection ${p.yearLabel}`}" along with all its
                          employees, overheads, and sales-support resources. Quotations linked to it will keep their data
                          but lose the link. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(p.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Link href={`/projection/${p.id}`}>
                  <Button size="sm">Open <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Projection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={updateProjection.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
