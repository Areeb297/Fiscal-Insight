import { useState, useEffect, useRef } from "react";
import { 
  useListCurrencies, getListCurrenciesQueryKey, useCreateCurrency, useUpdateCurrency, useDeleteCurrency,
  useListCtcRules, getListCtcRulesQueryKey, useCreateCtcRule, useUpdateCtcRule, useDeleteCtcRule,
  useGetSystemSettings, getGetSystemSettingsQueryKey, useUpdateSystemSettings
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash, Save, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LogoCropper } from "@/components/logo-cropper";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currencies } = useListCurrencies({ query: { queryKey: getListCurrenciesQueryKey() } });
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();
  const deleteCurrency = useDeleteCurrency();

  const { data: ctcRules } = useListCtcRules({ query: { queryKey: getListCtcRulesQueryKey() } });
  const createCtcRule = useCreateCtcRule();
  const updateCtcRule = useUpdateCtcRule();
  const deleteCtcRule = useDeleteCtcRule();

  const { data: settings } = useGetSystemSettings({ query: { queryKey: getGetSystemSettingsQueryKey() } });
  const updateSettings = useUpdateSystemSettings();

  const [localSettings, setLocalSettings] = useState<any>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 1024 * 1024) {
      toast({ title: "Logo must be smaller than 1 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
    };
    reader.onerror = () => toast({ title: "Failed to read file", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleAddCurrency = () => {
    createCurrency.mutate(
      { data: { code: "NEW", name: "New Currency", symbol: "$", rateToSar: 1, isActive: true, isBase: false } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurrenciesQueryKey() }) }
    );
  };

  const handleUpdateCurrency = (id: number, field: string, value: any) => {
    updateCurrency.mutate(
      { id, data: { [field]: value } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurrenciesQueryKey() }) }
    );
  };

  const handleDeleteCurrency = (id: number) => {
    deleteCurrency.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCurrenciesQueryKey() }) }
    );
  };

  const handleAddCtcRule = () => {
    createCtcRule.mutate(
      { data: { countryName: "New Country", countryCode: "XX", ctcMultiplier: 1.5, isActive: true } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCtcRulesQueryKey() }) }
    );
  };

  const handleUpdateCtcRule = (id: number, field: string, value: any) => {
    updateCtcRule.mutate(
      { id, data: { [field]: value } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCtcRulesQueryKey() }) }
    );
  };

  const handleDeleteCtcRule = (id: number) => {
    deleteCtcRule.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCtcRulesQueryKey() }) }
    );
  };

  const handleSaveSettings = () => {
    if (!localSettings) return;
    const payload = {
      ...localSettings,
      vatRate:
        localSettings.vatRatePercent !== undefined && localSettings.vatRatePercent !== null && localSettings.vatRatePercent !== ""
          ? Number(localSettings.vatRatePercent) / 100
          : localSettings.vatRate,
    };
    delete payload.vatRatePercent;
    updateSettings.mutate(
      { data: payload },
      { 
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSystemSettingsQueryKey() });
          toast({ title: "Settings saved successfully" });
        }
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground mt-1">Manage system settings, currencies, and calculation rules</p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            System Settings
          </TabsTrigger>
          <TabsTrigger value="currencies" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            Currencies
          </TabsTrigger>
          <TabsTrigger value="ctcrules" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            CTC Rules
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3">
            Users & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6 space-y-6">
          <UsersPanel />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>General company information for quotations and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={localSettings?.companyName || ""} 
                    onChange={(e) => setLocalSettings({...localSettings, companyName: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-24 rounded border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                      {localSettings?.companyLogoUrl ? (
                        <img
                          src={localSettings.companyLogoUrl}
                          alt="Company logo preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No logo</span>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoFile(file);
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Upload
                    </Button>
                    {localSettings?.companyLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocalSettings({ ...localSettings, companyLogoUrl: "" })}
                      >
                        <X className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="…or paste an image URL"
                    value={localSettings?.companyLogoUrl?.startsWith("data:") ? "" : localSettings?.companyLogoUrl || ""}
                    onChange={(e) => setLocalSettings({ ...localSettings, companyLogoUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quotation Terms &amp; Conditions</Label>
                <Textarea
                  rows={4}
                  placeholder="Default terms and conditions printed on every quotation PDF..."
                  value={localSettings?.termsText || ""}
                  onChange={(e) => setLocalSettings({...localSettings, termsText: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Default Values</CardTitle>
              <CardDescription>Default parameters used when creating new records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Margin (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={localSettings?.defaultMargin || 0} 
                    onChange={(e) => setLocalSettings({...localSettings, defaultMargin: parseFloat(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Number of Clients</Label>
                  <Input 
                    type="number" 
                    value={localSettings?.defaultNumClients || 1} 
                    onChange={(e) => setLocalSettings({...localSettings, defaultNumClients: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={
                      localSettings?.vatRatePercent !== undefined
                        ? localSettings.vatRatePercent
                        : localSettings?.vatRate !== undefined && localSettings?.vatRate !== null
                          ? Number((Number(localSettings.vatRate) * 100).toFixed(4))
                          : 15
                    }
                    onChange={(e) => setLocalSettings({ ...localSettings, vatRatePercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quotation Prefix</Label>
                  <Input 
                    value={localSettings?.quotationPrefix || ""} 
                    onChange={(e) => setLocalSettings({...localSettings, quotationPrefix: e.target.value})} 
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveSettings}><Save className="h-4 w-4 mr-2" /> Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="currencies" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
              <div>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>Manage exchange rates relative to base currency (SAR)</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddCurrency}><Plus className="h-4 w-4 mr-2" /> Add Currency</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Rate to SAR</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies?.map((curr) => (
                      <TableRow key={curr.id}>
                        <TableCell className="p-2">
                          <Input defaultValue={curr.code} onBlur={(e) => handleUpdateCurrency(curr.id, "code", e.target.value)} disabled={curr.isBase} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent font-mono" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input defaultValue={curr.name} onBlur={(e) => handleUpdateCurrency(curr.id, "name", e.target.value)} disabled={curr.isBase} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input defaultValue={curr.symbol} onBlur={(e) => handleUpdateCurrency(curr.id, "symbol", e.target.value)} disabled={curr.isBase} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" step="0.0001" defaultValue={curr.rateToSar} onBlur={(e) => handleUpdateCurrency(curr.id, "rateToSar", parseFloat(e.target.value))} disabled={curr.isBase} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          <Switch checked={curr.isActive} onCheckedChange={(val) => handleUpdateCurrency(curr.id, "isActive", val)} disabled={curr.isBase} />
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          {!curr.isBase && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCurrency(curr.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ctcrules" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
              <div>
                <CardTitle>CTC Rules</CardTitle>
                <CardDescription>Cost to Company multipliers by country</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddCtcRule}><Plus className="h-4 w-4 mr-2" /> Add Rule</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Multiplier</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ctcRules?.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="p-2">
                          <Input defaultValue={rule.countryName} onBlur={(e) => handleUpdateCtcRule(rule.id, "countryName", e.target.value)} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input defaultValue={rule.countryCode} onBlur={(e) => handleUpdateCtcRule(rule.id, "countryCode", e.target.value)} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent font-mono" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" step="0.01" defaultValue={rule.ctcMultiplier} onBlur={(e) => handleUpdateCtcRule(rule.id, "ctcMultiplier", parseFloat(e.target.value))} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-right" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input defaultValue={rule.notes || ""} onBlur={(e) => handleUpdateCtcRule(rule.id, "notes", e.target.value)} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          <Switch checked={rule.isActive} onCheckedChange={(val) => handleUpdateCtcRule(rule.id, "isActive", val)} />
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCtcRule(rule.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LogoCropper
        open={!!cropperSrc}
        imageSrc={cropperSrc}
        onCancel={() => setCropperSrc(null)}
        onConfirm={(dataUrl) => {
          setLocalSettings({ ...localSettings, companyLogoUrl: dataUrl });
          setCropperSrc(null);
        }}
      />
    </div>
  );
}

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "user";
  createdAt: number;
};

function UsersPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const usersUrl = `${apiBase}/api/admin/users`;
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: [usersUrl],
    queryFn: async () => {
      const r = await fetch(usersUrl, { credentials: "include" });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      return r.json();
    },
  });

  async function setRole(id: string, role: "admin" | "user") {
    const r = await fetch(`${apiBase}/api/admin/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    if (!r.ok) {
      toast({ title: "Failed to update role", description: (await r.json()).error, variant: "destructive" });
      return;
    }
    toast({ title: `Role updated to ${role}` });
    queryClient.invalidateQueries({ queryKey: [usersUrl] });
  }

  async function resetPassword(id: string, email: string | null) {
    const pw = window.prompt(`Set a new password for ${email ?? id}\n\n(minimum 8 characters; the user will be signed out of all other devices)`);
    if (!pw) return;
    if (pw.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    const r = await fetch(`${apiBase}/api/admin/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: pw, signOutOtherSessions: true }),
    });
    if (!r.ok) {
      toast({ title: "Failed to reset password", description: (await r.json()).error, variant: "destructive" });
      return;
    }
    toast({ title: "Password reset", description: `Share the new password securely with ${email ?? id}.` });
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setCreating(true);
    const r = await fetch(usersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        firstName: newFirst,
        lastName: newLast,
        role: newRole,
      }),
    });
    setCreating(false);
    if (!r.ok) {
      toast({ title: "Failed to create user", description: (await r.json()).error, variant: "destructive" });
      return;
    }
    toast({ title: "User created", description: `${newEmail} can now sign in.` });
    setNewEmail(""); setNewPassword(""); setNewFirst(""); setNewLast(""); setNewRole("user");
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: [usersUrl] });
  }

  async function removeUser(id: string, email: string | null) {
    if (!confirm(`Delete user ${email ?? id}? This cannot be undone.`)) return;
    const r = await fetch(`${apiBase}/api/admin/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok && r.status !== 204) {
      toast({ title: "Failed to delete user", description: (await r.json()).error, variant: "destructive" });
      return;
    }
    toast({ title: "User deleted" });
    queryClient.invalidateQueries({ queryKey: [usersUrl] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Users & Permissions</CardTitle>
          <CardDescription>
            Each person sees only the projections they create. Admins see and manage everyone's projections.
          </CardDescription>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} variant={showCreate ? "outline" : "default"}>
          {showCreate ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showCreate ? "Cancel" : "Add user"}
        </Button>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={createUser} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label>First name</Label>
              <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last name</Label>
              <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Temporary password * (min 8)</Label>
              <Input type="text" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full md:w-auto">
                {creating ? "Creating…" : "Create user"}
              </Button>
            </div>
          </form>
        )}
        {isLoading && <div className="text-muted-foreground">Loading users…</div>}
        {error && (
          <div className="text-destructive text-sm">
            {(error as Error).message.includes("Admin") || (error as Error).message.includes("403")
              ? "You need admin access to manage users."
              : `Could not load users: ${(error as Error).message}`}
          </div>
        )}
        {users && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        u.role === "admin"
                          ? "inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          : "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => resetPassword(u.id, u.email)}>
                      Reset password
                    </Button>
                    {u.role === "admin" ? (
                      <Button size="sm" variant="outline" onClick={() => setRole(u.id, "user")}>
                        Revoke admin
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setRole(u.id, "admin")}>
                        Make admin
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => removeUser(u.id, u.email)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
