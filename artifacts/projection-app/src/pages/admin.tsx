import { useState, useEffect } from "react";
import { 
  useListCurrencies, getListCurrenciesQueryKey, useCreateCurrency, useUpdateCurrency, useDeleteCurrency,
  useListCtcRules, getListCtcRulesQueryKey, useCreateCtcRule, useUpdateCtcRule, useDeleteCtcRule,
  useGetSystemSettings, getGetSystemSettingsQueryKey, useUpdateSystemSettings
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    updateSettings.mutate(
      { data: localSettings },
      { 
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSystemSettingsQueryKey() });
          toast({ title: "Settings saved successfully" });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-24">
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
        </TabsList>
        
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
                  <Label>Company Logo URL</Label>
                  <Input 
                    value={localSettings?.companyLogoUrl || ""} 
                    onChange={(e) => setLocalSettings({...localSettings, companyLogoUrl: e.target.value})} 
                  />
                </div>
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
                    value={localSettings?.vatRate || 15} 
                    onChange={(e) => setLocalSettings({...localSettings, vatRate: parseFloat(e.target.value)})} 
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>Manage exchange rates relative to base currency (SAR)</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddCurrency}><Plus className="h-4 w-4 mr-2" /> Add Currency</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>CTC Rules</CardTitle>
                <CardDescription>Cost to Company multipliers by country</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddCtcRule}><Plus className="h-4 w-4 mr-2" /> Add Rule</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
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
    </div>
  );
}
