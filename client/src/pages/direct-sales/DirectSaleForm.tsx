import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Brand, Model, Version } from "@/lib/types";

export default function DirectSaleForm() {
  const [_, navigate] = useLocation();
  const [matchEdit, params] = useRoute<{ id: string }>("/direct-sales/edit/:id");
  const [matchNew] = useRoute("/direct-sales/new");
  const isEditing = !!matchEdit;
  const id = params?.id ? parseInt(params.id) : null;
  
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    brandId: "",
    modelId: "0",
    versionId: "0",
    discountPercentage: ""
  });
  
  // Fetch brands for the dropdown
  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  // Fetch models for the dropdown
  const { data: allModels = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });

  // Fetch versions for the dropdown
  const { data: allVersions = [] } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
  });

  // Filter models based on selected brand
  const filteredModels = formData.brandId 
    ? allModels.filter(model => model.brandId === parseInt(formData.brandId))
    : [];

  // Filter versions based on selected model
  const filteredVersions = formData.modelId && formData.modelId !== "0"
    ? allVersions.filter(version => version.modelId === parseInt(formData.modelId))
    : [];
  
  // If editing, fetch the direct sale data
  const { data: directSale, isLoading: directSaleLoading } = useQuery({
    queryKey: [`/api/direct-sales/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/direct-sales/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch direct sale');
      }
      return response.json();
    },
    enabled: isEditing && !!id,
  });
  
  // Initialize form with existing data if editing
  React.useEffect(() => {
    if (isEditing && directSale && !directSaleLoading) {
      setFormData({
        name: directSale.name || "",
        brandId: directSale.brandId?.toString() || "",
        modelId: directSale.modelId ? directSale.modelId.toString() : "0",
        versionId: directSale.versionId ? directSale.versionId.toString() : "0",
        discountPercentage: directSale.discountPercentage?.toString() || ""
      });
    }
  }, [isEditing, directSale, directSaleLoading]);
  
  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    if (name === 'brandId') {
      // Reset model and version when brand changes
      setFormData(prev => ({ ...prev, [name]: value, modelId: "0", versionId: "0" }));
    } else if (name === 'modelId') {
      // Reset version when model changes
      setFormData(prev => ({ ...prev, [name]: value, versionId: "0" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate form data
      if (!formData.name) throw new Error("O nome é obrigatório");
      if (!formData.brandId) throw new Error("A marca é obrigatória");
      if (!formData.discountPercentage) throw new Error("O percentual de desconto é obrigatório");
      
      const parsedData = {
        name: formData.name,
        brandId: parseInt(formData.brandId),
        modelId: formData.modelId && formData.modelId !== "0" ? parseInt(formData.modelId) : null,
        versionId: formData.versionId && formData.versionId !== "0" ? parseInt(formData.versionId) : null,
        discountPercentage: formData.discountPercentage // Keeping it as string to match schema expectation
      };
      
      // Create or update direct sale
      if (isEditing && id) {
        await apiRequest("PATCH", `/api/direct-sales/${id}`, parsedData);
        toast({
          title: "Venda direta atualizada",
          description: "A venda direta foi atualizada com sucesso.",
        });
      } else {
        await apiRequest("POST", "/api/direct-sales", parsedData);
        toast({
          title: "Venda direta criada",
          description: "A venda direta foi criada com sucesso.",
        });
      }
      
      // Refresh data and redirect
      queryClient.invalidateQueries({ queryKey: ["/api/direct-sales"] });
      navigate("/settings");
    } catch (error) {
      console.error("Erro ao salvar venda direta:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao salvar",
        description: message || "Ocorreu um erro ao salvar a venda direta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = (isEditing && directSaleLoading) || brandsLoading;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Editar Venda Direta" : "Nova Venda Direta"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/settings")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle>
                {isEditing ? "Editar Venda Direta" : "Nova Venda Direta"}
              </CardTitle>
            </div>
            <CardDescription>
              {isEditing 
                ? "Atualize as informações da venda direta" 
                : "Preencha as informações para criar uma nova venda direta"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleTextChange}
                placeholder="Nome da venda direta"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="brand-select">Marca</Label>
              <Select 
                value={formData.brandId} 
                onValueChange={(value) => handleSelectChange("brandId", value)}
              >
                <SelectTrigger id="brand-select">
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model-select">Modelo (Opcional)</Label>
              <Select 
                value={formData.modelId} 
                onValueChange={(value) => handleSelectChange("modelId", value)}
                disabled={!formData.brandId}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder={formData.brandId ? "Selecione um modelo ou deixe vazio para toda marca" : "Selecione uma marca primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aplicar a toda marca</SelectItem>
                  {filteredModels.map(model => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version-select">Versão (Opcional)</Label>
              <Select 
                value={formData.versionId} 
                onValueChange={(value) => handleSelectChange("versionId", value)}
                disabled={!formData.modelId || formData.modelId === "0"}
              >
                <SelectTrigger id="version-select">
                  <SelectValue placeholder={formData.modelId ? "Selecione uma versão ou deixe vazio para todo modelo" : "Selecione um modelo primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aplicar a todo modelo</SelectItem>
                  {filteredVersions.map(version => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="discountPercentage">Percentual de Desconto (%)</Label>
              <Input
                id="discountPercentage"
                name="discountPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountPercentage}
                onChange={handleTextChange}
                placeholder="Ex: 5.5"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate("/settings")}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Atualizar" : "Salvar"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}