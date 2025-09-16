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
  const { data: backups = [], isLoading: isLoadingBackups, refetch: refetchBackups } = useQuery<any[]>({
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
  
  // Função para criar backup
  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, digite um nome para o backup.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingBackup(true);
    try {
      await apiRequest("POST", "/api/backups", { name: backupName });
      toast({
        title: "Backup criado",
        description: "O backup foi criado com sucesso.",
      });
      setBackupName('');
      refetchBackups();
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast({
        title: "Erro ao criar backup",
        description: "Ocorreu um erro ao criar o backup. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  // Função para validar backup
  const handleValidateBackup = async (backupId: number) => {
    setIsValidatingBackup(true);
    try {
      const response = await fetch(`/api/backups/${backupId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      toast({
        title: result.isValid ? "Backup válido" : "Backup inválido",
        description: result.message || (result.isValid ? "O backup passou na validação." : "O backup apresentou problemas."),
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Erro ao validar backup:", error);
      toast({
        title: "Erro ao validar",
        description: "Ocorreu um erro ao validar o backup.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingBackup(false);
    }
  };
  
  // Função para fazer download do backup
  const handleDownloadBackup = async (backupId: number, fileName: string) => {
    try {
      const response = await fetch(`/api/backups/${backupId}/download`);
      if (!response.ok) throw new Error('Erro ao baixar backup');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download iniciado",
        description: "O download do backup foi iniciado.",
      });
    } catch (error) {
      console.error("Erro ao baixar backup:", error);
      toast({
        title: "Erro no download",
        description: "Ocorreu um erro ao baixar o backup.",
        variant: "destructive",
      });
    }
  };
  
  // Função para deletar backup
  const handleDeleteBackup = async (backupId: number) => {
    try {
      await apiRequest("DELETE", `/api/backups/${backupId}`);
      toast({
        title: "Backup deletado",
        description: "O backup foi removido com sucesso.",
      });
      refetchBackups();
    } catch (error) {
      console.error("Erro ao deletar backup:", error);
      toast({
        title: "Erro ao deletar",
        description: "Ocorreu um erro ao deletar o backup.",
        variant: "destructive",
      });
    }
  };
  
  // Função para restaurar backup
  const handleRestoreBackup = async (backupId: number) => {
    if (!confirm("ATENÇÃO: A restauração irá substituir todos os dados atuais. Esta ação não pode ser desfeita. Deseja continuar?")) {
      return;
    }
    
    setIsRestoringBackup(true);
    try {
      await apiRequest("POST", `/api/backups/${backupId}/restore`);
      toast({
        title: "Backup restaurado",
        description: "O backup foi restaurado com sucesso. A página será recarregada.",
      });
      // Recarregar a página após restauração
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      toast({
        title: "Erro na restauração",
        description: "Ocorreu um erro ao restaurar o backup.",
        variant: "destructive",
      });
    } finally {
      setIsRestoringBackup(false);
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
        
        <TabsContent value="backup" className="space-y-4">
          {/* Seção de Criar Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Criar Novo Backup
              </CardTitle>
              <CardDescription>
                Crie um backup completo do sistema incluindo todas as configurações e dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Nome do backup (ex: Backup-Sistema-2024)"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  disabled={isCreatingBackup}
                />
                <Button onClick={handleCreateBackup} disabled={isCreatingBackup || !backupName.trim()}>
                  {isCreatingBackup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <FileArchive className="mr-2 h-4 w-4" />
                      Criar Backup
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                O backup incluirá todas as tabelas do sistema: veículos, marcas, modelos, versões, cores, opcionais, configurações e dados de usuários.
              </p>
            </CardContent>
          </Card>
          
          {/* Seção de Lista de Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileArchive className="mr-2 h-5 w-5" />
                Backups Disponíveis
              </CardTitle>
              <CardDescription>
                Visualize, baixe, valide ou restaure backups existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBackups ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                  <span className="ml-2">Carregando backups...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="mx-auto h-12 w-12 mb-4" />
                  <p>Nenhum backup encontrado</p>
                  <p className="text-sm">Crie seu primeiro backup usando o formulário acima</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup: any) => (
                    <div key={backup.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-medium">{backup.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-4 w-4" />
                              {new Date(backup.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="flex items-center">
                              <HardDrive className="mr-1 h-4 w-4" />
                              {(backup.fileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span className="flex items-center">
                              <User className="mr-1 h-4 w-4" />
                              Tabelas: {backup.tablesCount}
                            </span>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                          backup.status === 'creating' ? 'bg-yellow-100 text-yellow-800' :
                          backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {backup.status === 'completed' && (
                            <><CheckCircle className="inline mr-1 h-3 w-3" />Concluído</>
                          )}
                          {backup.status === 'creating' && (
                            <><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Criando</>
                          )}
                          {backup.status === 'failed' && (
                            <><AlertTriangle className="inline mr-1 h-3 w-3" />Falhou</>
                          )}
                          {!['completed', 'creating', 'failed'].includes(backup.status) && backup.status}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadBackup(backup.id, backup.fileName)}
                          disabled={backup.status !== 'completed'}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Baixar
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidateBackup(backup.id)}
                          disabled={backup.status !== 'completed' || isValidatingBackup}
                        >
                          {isValidatingBackup ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Validar
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={backup.status !== 'completed' || isRestoringBackup}
                        >
                          {isRestoringBackup ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Restaurando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Restaurar
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={backup.status === 'creating'}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Seção de Informações sobre Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Informações Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="font-medium text-blue-900 mb-2">O que está incluído no backup:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Todos os veículos cadastrados</li>
                  <li>• Marcas, modelos e versões</li>
                  <li>• Cores e tipos de pintura</li>
                  <li>• Opcionais e configurações</li>
                  <li>• Configurações do sistema</li>
                  <li>• Dados de usuários e permissões</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <h4 className="font-medium text-yellow-900 mb-2">Recomendações:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Crie backups regulares (recomendamos semanalmente)</li>
                  <li>• Sempre valide um backup após sua criação</li>
                  <li>• Faça download dos backups importantes</li>
                  <li>• Teste a restauração em um ambiente de desenvolvimento</li>
                </ul>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <h4 className="font-medium text-red-900 mb-2">⚠️ Atenção:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• A restauração substitui TODOS os dados atuais</li>
                  <li>• Esta ação NÃO pode ser desfeita</li>
                  <li>• Sempre confirme se é o backup correto antes de restaurar</li>
                  <li>• Recomendamos criar um backup antes de restaurar outro</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
