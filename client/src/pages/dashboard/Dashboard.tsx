import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Car, Palette, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle, Brand, Model, Color } from "@/lib/types";
import { formatBRCurrencyWithSymbol } from "@/lib/formatters";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Configurator2 from "@/pages/configurator2";
import { useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  
  // Configurações de tema agora são carregadas no AdminLayout
  
  // Se for usuário regular, mostrar o configurador diretamente
  if (user?.role?.name === "Usuário") {
    return <Configurator2 />;
  }
  // Buscar dados reais do banco de dados
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: getQueryFn(),
  });
  
  const { data: brands = [], isLoading: loadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    queryFn: getQueryFn(),
  });
  
  const { data: models = [], isLoading: loadingModels } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    queryFn: getQueryFn(),
  });
  
  const { data: colors = [], isLoading: loadingColors } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
    queryFn: getQueryFn(),
  });
  
  // Verificar se está carregando dados
  const isLoading = loadingVehicles || loadingBrands || loadingModels || loadingColors;
  
  // Função para exibir status em português
  const formatStatus = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Disponível', class: 'bg-green-100 text-green-800' };
      case 'unavailable':
        return { label: 'Indisponível', class: 'bg-red-100 text-red-800' };
      case 'coming-soon':
        return { label: 'Em breve', class: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: status, class: 'bg-gray-100 text-gray-800' };
    }
  };
  
  // Ordenar veículos por data de criação (mais recentes primeiro)
  const recentVehicles = [...vehicles]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando dados...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total de Veículos</CardTitle>
                <Car className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vehicles.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de veículos cadastrados no sistema
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Marcas</CardTitle>
                <Building className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brands.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de marcas cadastradas no sistema
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Modelos</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{models.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de modelos cadastrados no sistema
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Cores</CardTitle>
                <Palette className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{colors.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de cores cadastradas no sistema
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isLoading && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Veículos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">Veículo</th>
                    <th className="py-3 px-4 text-left">Marca</th>
                    <th className="py-3 px-4 text-left">Modelo</th>
                    <th className="py-3 px-4 text-left">Preço</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVehicles.length > 0 ? (
                    recentVehicles.map(vehicle => {
                      const status = formatStatus(vehicle.situation);
                      return (
                        <tr key={vehicle.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{vehicle.version?.name || "N/A"} {vehicle.engine}</td>
                          <td className="py-3 px-4">{vehicle.version?.model?.brand?.name || "N/A"}</td>
                          <td className="py-3 px-4">{vehicle.version?.model?.name || "N/A"}</td>
                          <td className="py-3 px-4">{formatBRCurrencyWithSymbol(vehicle.publicPrice)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${status.class}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500">
                        Nenhum veículo cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
