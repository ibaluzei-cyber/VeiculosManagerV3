import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "@/lib/queryClient";
import DirectSaleList from "../../pages/direct-sales/DirectSaleList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Download, Upload, Trash2, Database, CheckCircle, AlertTriangle, FileArchive, Calendar, User, HardDrive } from "lucide-react";

type Setting = {
  id: number;
  key: string;
  value: string;
  label: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export default function Settings() {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<Record<string, string | boolean>>({});
  
  // Estados para backup
  const [backupName, setBackupName] = React.useState('');
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false);
  const [isValidatingBackup, setIsValidatingBackup] = React.useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = React.useState(false);
  
  // Buscar configurações do servidor
  const { data: settings = [], isLoading, error } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  // Buscar backups existentes
  const { data: backups = [], isLoading: isLoadingBackups, refetch: refetchBackups } = useQuery({
    queryKey: ["/api/backups"],
  });
  
  // Inicializa o formulário quando as configurações são carregadas
  React.useEffect(() => {
    if (settings.length > 0) {
      const initialFormData: Record<string, string | boolean> = {};
      settings.forEach(setting => {
        if (setting.type === "boolean") {
          initialFormData[setting.key] = setting.value.toLowerCase() === "true";
        } else {
          initialFormData[setting.key] = setting.value;
        }
      });
      setFormData(initialFormData);
    }
  }, [settings]);
  
  // Manipulador para campos de texto
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipulador para campos booleanos (switches)
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Função para salvar as configurações
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Para cada configuração, atualizar no servidor
      for (const setting of settings) {
        const value = formData[setting.key];
        // Converte valor para string se for boolean, ou usa string vazia se for undefined
        const valueStr = typeof value === "boolean" 
          ? value.toString() 
          : (value === undefined || value === null ? "" : value as string);
        
        try {
          await apiRequest("PATCH", `/api/settings/key/${setting.key}`, { 
            value: valueStr
          });
        } catch (err) {
          console.error(`Erro ao atualizar configuração ${setting.key}:`, err);
          // Se uma configuração falhar, continua com as demais
        }
      }
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
      
      // Atualizar o cache para que os dados sejam recarregados
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        <p className="font-medium">Erro ao carregar configurações</p>
        <p className="text-sm mt-1">Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }
  
  // Agrupar configurações por tipo
  const generalSettings = settings.filter(s => ["admin_email", "default_currency"].includes(s.key));
  const taxSettings = settings.filter(s => ["tax_rate", "enable_pcd_discounts"].includes(s.key));
  const companySettings = settings.filter(s => ["company_name", "company_logo_url"].includes(s.key));
  const appSettings = settings.filter(s => ["app_name", "app_favicon"].includes(s.key));
  const themeSettings = settings.filter(s => s.key.startsWith("theme_color_"));
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="direct-sales">Vendas Diretas</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="app">Aplicação</TabsTrigger>
          <TabsTrigger value="theme">Cores do Tema</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
              <CardDescription>
                Configurações gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generalSettings.map(setting => (
                <div key={setting.id} className="grid gap-2">
                  <Label htmlFor={setting.key}>{setting.label}</Label>
                  <Input
                    id={setting.key}
                    name={setting.key}
                    type={setting.type === "email" ? "email" : "text"}
                    value={formData[setting.key] as string || ""}
                    onChange={handleTextChange}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="direct-sales" className="space-y-4">
          <DirectSaleList />
        </TabsContent>
        
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Configure o nome e o logo da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo para nome da empresa */}
              <div className="grid gap-2">
                <Label htmlFor="company_name">Nome da empresa</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData["company_name"] as string || ""}
                  onChange={handleTextChange}
                  placeholder="Nome da empresa"
                />
              </div>
              
              {/* Campo para URL do logo */}
              <div className="grid gap-2">
                <Label htmlFor="company_logo_url">URL do logo</Label>
                <Input
                  id="company_logo_url"
                  name="company_logo_url"
                  value={formData["company_logo_url"] as string || ""}
                  onChange={handleTextChange}
                  placeholder="URL da imagem do logo (opcional)"
                />
              </div>
              

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="app" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Aplicação</CardTitle>
              <CardDescription>
                Configure o nome e o favicon da aplicação que aparecem na aba do navegador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo para nome da aplicação */}
              <div className="grid gap-2">
                <Label htmlFor="app_name">Nome da Aplicação</Label>
                <Input
                  id="app_name"
                  name="app_name"
                  value={formData["app_name"] as string || ""}
                  onChange={handleTextChange}
                  placeholder="Nome da aplicação que aparece na aba do navegador"
                />
                <p className="text-sm text-muted-foreground">
                  Este nome será exibido na aba do navegador.
                </p>
              </div>
              
              {/* Campo para URL do favicon */}
              <div className="grid gap-2">
                <Label htmlFor="app_favicon">URL do Favicon</Label>
                <Input
                  id="app_favicon"
                  name="app_favicon"
                  value={formData["app_favicon"] as string || ""}
                  onChange={handleTextChange}
                  placeholder="URL do ícone para a aba do navegador (opcional)"
                />
                <p className="text-sm text-muted-foreground">
                  URL para uma imagem quadrada que será usada como favicon. Para melhor resultado, use uma imagem de 32x32 pixels ou maior.
                </p>
                {formData["app_favicon"] && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Visualização:</p>
                    <img 
                      src={formData["app_favicon"] as string} 
                      alt="Favicon Preview" 
                      className="w-8 h-8 border border-gray-200 rounded"
                      onError={(e) => {
                        // Se a imagem não carregar, mostra um placeholder
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalização de Cores</CardTitle>
              <CardDescription>
                Personalize as cores do tema da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themeSettings.map(setting => (
                  <div key={setting.id} className="space-y-2">
                    <Label htmlFor={setting.key}>{setting.label}</Label>
                    <div className="flex space-x-2">
                      <div 
                        className="w-10 h-10 rounded border" 
                        style={{ backgroundColor: formData[setting.key] as string || '' }}
                      />
                      <Input
                        id={setting.key}
                        name={setting.key}
                        type="text"
                        value={formData[setting.key] as string || ""}
                        onChange={handleTextChange}
                        className="flex-1"
                        placeholder="Código hexadecimal (ex: #0a9587)"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Digite um código hexadecimal válido (ex: #0a9587)
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">Visualização das cores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Menu Ativo</p>
                    <div 
                      className="h-10 w-full rounded" 
                      style={{ backgroundColor: formData["theme_color_active_menu"] as string || '#0a9587' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Barra do Logo</p>
                    <div 
                      className="h-10 w-full rounded" 
                      style={{ backgroundColor: formData["theme_color_logo_bar"] as string || '#01a896' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Sidebar Ativo</p>
                    <div 
                      className="h-10 w-full rounded" 
                      style={{ backgroundColor: formData["theme_color_active_sidebar"] as string || '#e6f6f5' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Nota: As alterações nas cores serão aplicadas após salvar e recarregar a página.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
