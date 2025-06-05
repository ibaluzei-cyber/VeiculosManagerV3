import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Vehicle, VehicleStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

export default function VehicleList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
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
      const response = await fetch('/api/vehicles/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar veículos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `veiculos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar veículos:", error);
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
    // Status filter
    if (statusFilter !== "all" && vehicle.status !== statusFilter) {
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
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Veículos
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
    </div>
  );
}
