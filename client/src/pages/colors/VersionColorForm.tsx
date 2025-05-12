import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Brand, Model, Version, Color } from "@/lib/types";

const formSchema = z.object({
  modelId: z.string().min(1, "Selecione um modelo"),
  versionId: z.string().min(1, "Selecione uma versão"),
  colorId: z.string().min(1, "Selecione uma cor"),
  price: z.coerce.number().min(0, "O preço não pode ser negativo"),
  imageUrl: z.string().url("Informe uma URL válida").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface VersionColorFormProps {
  id?: number | null;
  onCancel?: () => void;
}

export default function VersionColorForm({ id, onCancel }: VersionColorFormProps) {
  const { toast } = useToast();
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<Version[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelId: "",
      versionId: "",
      colorId: "",
      price: 0,
      imageUrl: "",
    },
  });
  
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });
  
  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });
  
  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
  });
  
  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });
  
  // Get selected brand from the model
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  
  // Update filtered models when brand changes
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    form.setValue("modelId", ""); // Reset model selection
    form.setValue("versionId", ""); // Reset version selection
    
    if (brandId) {
      const parsedBrandId = parseInt(brandId);
      setFilteredModels(models.filter(model => model.brandId === parsedBrandId));
    } else {
      setFilteredModels([]);
    }
    
    setFilteredVersions([]);
  };
  
  // Update filtered versions when model changes
  const handleModelChange = (modelId: string) => {
    form.setValue("modelId", modelId);
    form.setValue("versionId", ""); // Reset version selection
    
    if (modelId) {
      const parsedModelId = parseInt(modelId);
      setFilteredVersions(versions.filter(version => version.modelId === parsedModelId));
    } else {
      setFilteredVersions([]);
    }
  };
  
  const handleSubmit = async (values: FormValues) => {
    try {
      // Convert string IDs to numbers and ensure price is a string
      const data = {
        versionId: parseInt(values.versionId),
        colorId: parseInt(values.colorId),
        price: values.price.toString(), // Converter para string conforme esperado pelo schema
        imageUrl: values.imageUrl || null,
      };

      if (id) {
        // Atualizar um registro existente
        await apiRequest("PATCH", `/api/version-colors/${id}`, data);
        
        toast({
          title: "Associação atualizada com sucesso",
          description: "A associação de cor foi atualizada.",
        });
        
        // Se houver uma função de cancelamento, chamá-la após o sucesso
        if (onCancel) {
          onCancel();
        }
      } else {
        // Criar um novo registro
        await apiRequest("POST", "/api/version-colors", data);
        
        toast({
          title: "Cores associadas com sucesso",
          description: "A cor foi associada à versão selecionada.",
        });
        
        // Reset form somente para criação
        form.reset({
          modelId: "",
          versionId: "",
          colorId: "",
          price: 0,
          imageUrl: "",
        });
        setSelectedBrandId("");
        setFilteredModels([]);
        setFilteredVersions([]);
      }
      
      // Atualizar a lista em ambos os casos
      queryClient.invalidateQueries({ queryKey: ["/api/version-colors"] });
      
    } catch (error) {
      console.error("Failed to save version color:", error);
      toast({
        title: id ? "Erro ao atualizar associação" : "Erro ao associar cor",
        description: id 
          ? "Ocorreu um erro ao atualizar a associação de cor." 
          : "Ocorreu um erro ao associar a cor à versão.",
        variant: "destructive",
      });
    }
  };
  
  // Buscar dados para edição quando o id estiver presente
  const { data: versionColorData } = useQuery({
    queryKey: [`/api/version-colors/${id}`],
    // Vamos usar o queryFn padrão que já está configurado no queryClient
    enabled: !!id,
  });

  // Preencher o formulário com os dados da versão de cor quando disponíveis
  useEffect(() => {
    console.log("versionColorData recebido:", versionColorData);
    
    // Usar typecasting para evitar problemas de tipo
    const data = versionColorData as any;
    
    if (data && data.versionId !== undefined && data.colorId !== undefined) {
      try {
        const versionId = data.versionId?.toString() || "";
        const colorId = data.colorId?.toString() || "";
        const modelId = data.version?.modelId?.toString() || "";
        const brandId = data.version?.model?.brandId?.toString() || "";
        
        console.log("Valores extraídos:", {
          versionId,
          colorId,
          modelId,
          brandId,
          version: data.version,
          model: data.version?.model
        });
        
        // Configurar valores primeiro
        form.setValue("colorId", colorId);
        form.setValue("price", data.price ? parseFloat(data.price.toString()) : 0);
        form.setValue("imageUrl", data.imageUrl || "");
        
        // Manipular o estado de marca/modelo como uma operação separada
        if (brandId) {
          const brandIdInt = parseInt(brandId);
          setSelectedBrandId(brandId);
          console.log("Configurando marca:", brandIdInt);
          form.setValue("brandId", brandId);
          
          // Filtrar modelos pela marca selecionada
          const filteredModelsByBrand = models.filter(model => model.brandId === brandIdInt);
          setFilteredModels(filteredModelsByBrand);
          console.log("Modelos filtrados pela marca:", filteredModelsByBrand);
          
          // Configurar modelo depois de filtrar pela marca
          if (modelId) {
            console.log("Configurando modelo:", modelId);
            form.setValue("modelId", modelId);
            
            // Filtrar versões pelo modelo selecionado
            const modelIdInt = parseInt(modelId);
            const filteredVersionsByModel = versions.filter(version => version.modelId === modelIdInt);
            setFilteredVersions(filteredVersionsByModel);
            console.log("Versões filtradas pelo modelo:", filteredVersionsByModel);
            
            // Finalmente configurar versão
            console.log("Configurando versão:", versionId);
            form.setValue("versionId", versionId);
          }
        }
      } catch (err) {
        console.error("Erro ao processar dados da versão de cor:", err);
      }
    }
  }, [versionColorData, form, models, versions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{id ? 'Editar Associação de Pintura' : 'Associar Pintura à Versão'}</CardTitle>
        <CardDescription>
          {id ? 'Edite os detalhes da associação de pintura' : 'Escolha um modelo, versão e cor para associar uma pintura específica a uma versão de veículo'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <Select 
                      value={selectedBrandId} 
                      onValueChange={handleBrandChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma marca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={handleModelChange}
                      disabled={!selectedBrandId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id.toString()}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="versionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versão</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={!form.getValues("modelId")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma versão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredVersions.map((version) => (
                          <SelectItem key={version.id} value={version.id.toString()}>
                            {version.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="colorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pintura</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pintura" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color.id} value={color.id.toString()}>
                            <div className="flex items-center">
                              <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: color.hexCode }}></span>
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                        <Input 
                          className="pl-8" 
                          type="number"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="URL da imagem específica para esta combinação"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {id ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}