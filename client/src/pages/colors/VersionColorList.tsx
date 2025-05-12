import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, RefreshCw } from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brand, Model, Version } from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface VersionColor {
  id: number;
  versionId: number;
  colorId: number;
  price: number;
  imageUrl: string | null;
  version: {
    id: number;
    name: string;
    modelId: number;
    model: {
      id: number;
      name: string;
      brandId: number;
      brand: {
        id: number;
        name: string;
      }
    }
  };
  color: {
    id: number;
    name: string;
    hexCode: string;
    additionalPrice: number;
    imageUrl: string | null;
  };
}

interface VersionColorListProps {
  onEdit: (id: number) => void;
}

export default function VersionColorList({ onEdit }: VersionColorListProps) {
  const { toast } = useToast();
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [selectedModelId, setSelectedModelId] = useState<string>("all");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("all");
  
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    queryFn: getQueryFn()
  });
  
  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    queryFn: getQueryFn()
  });
  
  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
    queryFn: getQueryFn()
  });
  
  const { data: versionColors = [], isLoading } = useQuery({
    queryKey: ["/api/version-colors", selectedBrandId, selectedModelId, selectedVersionId],
    queryFn: getQueryFn({
      transformParams: () => {
        const params = new URLSearchParams();
        
        // Adicionei debug para verificar valores selecionados
        console.log("Filtros aplicados:", { 
          brandId: selectedBrandId, 
          modelId: selectedModelId, 
          versionId: selectedVersionId 
        });
        
        if (selectedModelId && selectedModelId !== "all") {
          params.append("modelId", selectedModelId);
        }
        
        if (selectedVersionId && selectedVersionId !== "all") {
          params.append("versionId", selectedVersionId);
        }
        
        return params.toString() ? `?${params.toString()}` : "";
      }
    }),
    enabled: true,
  });
  
  const filteredModels = selectedBrandId && selectedBrandId !== "all"
    ? models.filter(model => model.brandId === parseInt(selectedBrandId))
    : models;
    
  const filteredVersions = selectedModelId && selectedModelId !== "all"
    ? versions.filter(version => version.modelId === parseInt(selectedModelId))
    : versions;
    
  const handleDeleteVersionColor = async (id: number) => {
    if (confirm("Tem certeza que deseja remover esta associação de cor?")) {
      try {
        await apiRequest("DELETE", `/api/version-colors/${id}`);
        
        toast({
          title: "Associação removida",
          description: "A associação de cor foi removida com sucesso.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/version-colors"] });
      } catch (error) {
        console.error("Error deleting version color:", error);
        toast({
          title: "Erro ao remover associação",
          description: "Não foi possível remover a associação de cor.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Filtragem manual por marca, já que o backend não dá suporte direto para isso
  const filteredVersionColors = useMemo(() => {
    if (!versionColors || !Array.isArray(versionColors)) return [];
    
    // Se não tiver filtro de marca, retorna todos
    if (!selectedBrandId || selectedBrandId === "all") return versionColors;
    
    // Filtra manualmente por marca
    const brandId = parseInt(selectedBrandId);
    return versionColors.filter(vc => {
      // Verifica se existe version, model e brand na relação carregada
      const version = vc.version as any;
      if (!version || !version.model || !version.model.brand) return false;
      
      return version.model.brand.id === brandId;
    });
  }, [versionColors, selectedBrandId]);
  
  // Verificar dados recebidos para debugging
  useEffect(() => {
    console.log("VersionColors recebidos:", versionColors);
    console.log("VersionColors filtrados:", filteredVersionColors);
  }, [versionColors, filteredVersionColors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pinturas Associadas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Select
              value={selectedBrandId} 
              onValueChange={(value) => {
                setSelectedBrandId(value);
                setSelectedModelId("all");
                setSelectedVersionId("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={selectedModelId}
              onValueChange={(value) => {
                setSelectedModelId(value);
                setSelectedVersionId("all");
              }}
              disabled={!selectedBrandId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
                {filteredModels.map((model) => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select
              value={selectedVersionId}
              onValueChange={setSelectedVersionId}
              disabled={!selectedModelId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por versão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as versões</SelectItem>
                {filteredVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="mb-4"
          onClick={() => {
            // Forçar atualização dos dados
            queryClient.invalidateQueries({ queryKey: ["/api/version-colors"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        
        {isLoading ? (
          <div>Carregando...</div>
        ) : Array.isArray(versionColors) && versionColors.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Pintura</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versionColors.map((versionColor: any) => (
                <TableRow key={versionColor.id}>
                  <TableCell>{versionColor.version?.model?.name || "N/A"}</TableCell>
                  <TableCell>{versionColor.version?.name || "N/A"}</TableCell>
                  <TableCell>
                    {versionColor.color?.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(versionColor.price) || 0)}
                  </TableCell>
                  <TableCell>
                    {versionColor.imageUrl ? (
                      <img 
                        src={versionColor.imageUrl} 
                        alt={`${versionColor.version?.name || ""} - ${versionColor.color?.name || ""}`} 
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      "Sem imagem"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(versionColor.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteVersionColor(versionColor.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4">
            Nenhuma associação de pintura encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  );
}