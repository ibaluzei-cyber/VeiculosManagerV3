import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash, Download, CheckCircle, FileText, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Vehicle, VehicleStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

export default function VehicleList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadProgress, setDownloadProgress] = useState({
    isDownloading: false,
    progress: 0,
    stage: '',
    recordsProcessed: 0,
    totalRecords: 0,
    isComplete: false
  });
  
  const { toast } = useToast();
  
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/vehicles/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    }
  };

  const handleExportCSV = async () => {
    try {
      // Toast de início
      toast({
        title: "Iniciando exportação",
        description: `Preparando exportação de ${vehicles.length} veículos...`,
      });

      // Inicializar progresso
      setDownloadProgress({
        isDownloading: true,
        progress: 0,
        stage: 'Iniciando exportação...',
        recordsProcessed: 0,
        totalRecords: vehicles.length,
        isComplete: false
      });

      // Simular etapas de progresso para melhor UX
      const stages = [
        { stage: 'Conectando ao servidor...', progress: 10 },
        { stage: 'Processando dados dos veículos...', progress: 30 },
        { stage: 'Buscando informações das cores...', progress: 60 },
        { stage: 'Gerando arquivo CSV...', progress: 80 },
        { stage: 'Preparando download...', progress: 95 }
      ];

      let currentStage = 0;
      const progressInterval = setInterval(() => {
        if (currentStage < stages.length) {
          setDownloadProgress(prev => ({
            ...prev,
            stage: stages[currentStage].stage,
            progress: stages[currentStage].progress,
            recordsProcessed: Math.floor((stages[currentStage].progress / 100) * vehicles.length)
          }));
          currentStage++;
        }
      }, 800);

      const response = await fetch('/api/vehicles/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Falha ao exportar veículos');
      }

      // Finalizar progresso
      setDownloadProgress(prev => ({
        ...prev,
        stage: 'Download concluído!',
        progress: 100,
        recordsProcessed: vehicles.length,
        isComplete: true
      }));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `veiculos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Toast de sucesso
      toast({
        title: "Exportação concluída com sucesso!",
        description: `Arquivo CSV com ${vehicles.length} veículos foi baixado para sua pasta de downloads.`,
        variant: "default",
      });

      // Auto-fechar o dialog após sucesso
      setTimeout(() => {
        setDownloadProgress(prev => ({ ...prev, isDownloading: false }));
      }, 2000);

    } catch (error) {
      console.error("Erro ao exportar veículos:", error);
      
      // Toast de erro
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os veículos. Tente novamente.",
        variant: "destructive",
      });

      setDownloadProgress(prev => ({
        ...prev,
        stage: 'Erro ao exportar veículos',
        progress: 0,
        isComplete: false
      }));
      
      // Fechar dialog após erro
      setTimeout(() => {
        setDownloadProgress(prev => ({ ...prev, isDownloading: false }));
      }, 3000);
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'coming-soon':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'unavailable':
        return 'Indisponível';
      case 'coming-soon':
        return 'Em breve';
      default:
        return status;
    }
  };
  
  const filteredVehicles = vehicles.filter(vehicle => {
    // Status filter (situação)
    if (statusFilter !== "all" && vehicle.situation !== statusFilter) {
      return false;
    }
    
    // Search filter
    return (
      vehicle.version.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.version.model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.version.model.brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.year.toString().includes(searchQuery)
    );
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Veículos</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportCSV} 
            variant="outline"
            disabled={downloadProgress.isDownloading}
            className={`transition-all duration-200 ${
              downloadProgress.isDownloading 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'hover:bg-gray-50'
            }`}
          >
            {downloadProgress.isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloadProgress.isDownloading ? 'Exportando...' : 'Exportar Veículos'}
          </Button>
          <Link href="/vehicles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Veículos</CardTitle>
          <CardDescription>
            Gerencie os veículos disponíveis
          </CardDescription>
          <div className="flex mt-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar veículos..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
                <SelectItem value="coming-soon">Em breve</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Carregando...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum veículo encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {vehicle.color?.imageUrl ? (
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={vehicle.color.imageUrl}
                              alt={`${vehicle.version.model.brand.name} ${vehicle.version.model.name}`}
                            />
                          ) : (
                            <div 
                              className="h-10 w-10 rounded-full border border-gray-200"
                              style={{ backgroundColor: vehicle.color?.hexCode || '#fff' }}
                            />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.version.model.brand.name} {vehicle.version.model.name} {vehicle.version.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vehicle.engine} {vehicle.fuelType} {vehicle.transmission}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>{formatCurrency(vehicle.publicPrice)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(vehicle.situation)}`}>
                        {getStatusLabel(vehicle.situation)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {vehicle.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/vehicles/${vehicle.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Download Progress Dialog */}
      <Dialog open={downloadProgress.isDownloading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {downloadProgress.isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <FileText className="h-5 w-5 text-blue-500" />
              )}
              Exportando Veículos
            </DialogTitle>
            <DialogDescription>
              {downloadProgress.isComplete 
                ? "Arquivo CSV gerado com sucesso!"
                : "Por favor aguarde enquanto processamos seus dados..."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{downloadProgress.stage}</span>
                <span className="text-muted-foreground">
                  {downloadProgress.progress}%
                </span>
              </div>
              <Progress 
                value={downloadProgress.progress} 
                className="w-full"
              />
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Registros processados: {downloadProgress.recordsProcessed} de {downloadProgress.totalRecords}
              </span>
              <span>
                {downloadProgress.isComplete && "✓ Concluído"}
              </span>
            </div>
            
            {downloadProgress.isComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Download iniciado automaticamente
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  O arquivo CSV foi baixado para sua pasta de downloads com {downloadProgress.totalRecords} veículos.
                </p>
              </div>
            )}
            
            {downloadProgress.stage === 'Erro ao exportar veículos' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-sm font-medium">
                    Falha na exportação
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Ocorreu um erro durante a exportação. Tente novamente.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
