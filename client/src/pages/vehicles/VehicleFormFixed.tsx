import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brand, Model, Version, Color, FuelType, TransmissionType, VehicleSituation, Vehicle } from "@/lib/types";
import { formatBRCurrency, formatBRCurrencyWithSymbol, parseBRCurrency } from "@/lib/formatters";

const FUEL_TYPES = [
  { value: 'flex', label: 'Flex' },
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Elétrico' },
  { value: 'hybrid', label: 'Híbrido' }
];

const TRANSMISSION_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automático' },
  { value: 'cvt', label: 'CVT' },
  { value: 'dct', label: 'DCT (Dupla Embreagem)' }
];

const SITUATIONS = [
  { value: 'available', label: 'Disponível' },
  { value: 'unavailable', label: 'Indisponível' },
  { value: 'coming-soon', label: 'Em breve' }
];

// Schema de validação do formulário
const formSchema = z.object({
  brandId: z.string().min(1, "Selecione uma marca"),
  modelId: z.string().min(1, "Selecione um modelo"),
  versionId: z.string().min(1, "Selecione uma versão"),
  colorId: z.string().optional().default(""), // Tornando o campo cor opcional
  year: z.coerce.number().min(1900, "Ano inválido").max(new Date().getFullYear() + 5, "Ano muito avançado"),
  publicPrice: z.string().min(1, "Informe o preço público"),
  situation: z.enum(['available', 'unavailable', 'coming-soon']),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  engine: z.string().min(2, "Informe o motor do veículo"),
  fuelType: z.enum(['flex', 'gasoline', 'diesel', 'electric', 'hybrid']),
  transmission: z.enum(['manual', 'automatic', 'cvt', 'dct']),
  isActive: z.boolean().default(true),
  pcdIpiIcms: z.string().default("0"),
  pcdIpi: z.string().default("0"),
  taxiIpiIcms: z.string().default("0"),
  taxiIpi: z.string().default("0")
});

type FormValues = z.infer<typeof formSchema>;

export default function VehicleFormFixed() {
  const params = useParams();
  const id = params?.id ? parseInt(params.id) : undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = Boolean(id);
  
  console.log("Inicializando formulário com id:", id, "isEditing:", isEditing);
  
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<Version[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandId: "",
      modelId: "",
      versionId: "",
      colorId: "",
      year: new Date().getFullYear(),
      publicPrice: "0",
      situation: "available",
      description: "",
      engine: "",
      fuelType: "flex",
      transmission: "automatic",
      isActive: true,
      pcdIpiIcms: "",
      pcdIpi: "",
      taxiIpiIcms: "",
      taxiIpi: ""
    },
  });
  
  // Consultas para buscar dados
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
  
  const { data: vehicle, isLoading: isLoadingVehicle } = useQuery<Vehicle>({
    queryKey: [isEditing ? `/api/vehicles/${id}` : null],
    enabled: isEditing,
  });
  
  // Estados para armazenar os nomes selecionados
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("");
  const [selectedVersionName, setSelectedVersionName] = useState<string>("");
  const [dataWasLoaded, setDataWasLoaded] = useState(false);
  
  // Reset do formulário quando navegamos para outro veículo
  useEffect(() => {
    if (isEditing && id) {
      // Resetar o estado para permitir carregar novos dados de outro veículo
      setDataWasLoaded(false);
      setIsSubmitting(false); // Garantir que o estado de submissão esteja resetado
    }
  }, [id, isEditing]);
  
  // Preencher o formulário com os dados do veículo quando estiver editando
  useEffect(() => {
    // Só executamos se todos os dados necessários estiverem disponíveis
    if (vehicle && isEditing && models.length > 0 && versions.length > 0) {
      console.log("Carregando dados do veículo para edição:", vehicle);
      console.log("Modelos disponíveis:", models);
      console.log("Versões disponíveis:", versions);
      
      try {
        // Sempre carregamos os dados do veículo ao editar
        
        // Carregar dados relacionados de forma consistente
        const brandId = vehicle.version.model.brandId.toString();
        const modelId = vehicle.version.modelId.toString();
        const versionId = vehicle.versionId.toString();
        
        console.log(`Definindo marca=${brandId}, modelo=${modelId}, versão=${versionId}`);
        
        // Obter os nomes para exibição nos campos de seleção
        const brandName = brands.find(b => b.id === vehicle.version.model.brandId)?.name || "";
        const modelName = models.find(m => m.id === vehicle.version.modelId)?.name || "";
        const versionName = versions.find(v => v.id === vehicle.versionId)?.name || "";
        
        // Armazenar os nomes
        setSelectedBrandName(brandName);
        setSelectedModelName(modelName);
        setSelectedVersionName(versionName);
        
        console.log(`Nomes encontrados: marca=${brandName}, modelo=${modelName}, versão=${versionName}`);
        
        // Primeiro filtramos os modelos pela marca
        const modelsForBrand = models.filter(model => model.brandId === vehicle.version.model.brandId);
        setFilteredModels(modelsForBrand);
        console.log("Modelos filtrados:", modelsForBrand);
        
        // Filtramos as versões pelo modelo
        const versionsForModel = versions.filter(version => version.modelId === vehicle.version.modelId);
        setFilteredVersions(versionsForModel);
        console.log("Versões filtradas:", versionsForModel);
        
        // Definimos TODOS os valores do formulário de uma vez só para evitar problemas de ordem
        form.reset({
          brandId: brandId,
          modelId: modelId,
          versionId: versionId,
          colorId: vehicle.colorId ? vehicle.colorId.toString() : "",
          year: vehicle.year,
          publicPrice: formatBRCurrency(Number(vehicle.publicPrice)),
          situation: vehicle.situation,
          description: vehicle.description,
          engine: vehicle.engine,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          isActive: vehicle.isActive,
          pcdIpiIcms: formatBRCurrency(Number(vehicle.pcdIpiIcms)),
          pcdIpi: formatBRCurrency(Number(vehicle.pcdIpi)),
          taxiIpiIcms: formatBRCurrency(Number(vehicle.taxiIpiIcms)),
          taxiIpi: formatBRCurrency(Number(vehicle.taxiIpi))
        });
        
        // Força a atualização dos campos usando setValue após o reset do formulário
        // Isso garante que os valores sejam atualizados corretamente nos componentes Select
        setTimeout(() => {
          form.setValue("brandId", brandId);
          form.setValue("modelId", modelId);
          form.setValue("versionId", versionId);
          
          // Atualiza os nomes para exibição nos componentes Select
          setSelectedBrandName(brandName);
          setSelectedModelName(modelName);
          setSelectedVersionName(versionName);
          
          console.log("Valores de campos e nomes atualizados manualmente após reset");
        }, 100);
        
        console.log("Formulário preenchido com dados do veículo");
        
        // Definimos que os dados foram carregados após carregar tudo
        setDataWasLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar dados do veículo:", error);
      }
    }
  }, [vehicle, isEditing, brands, models, versions]);
  
  // Atualiza modelos filtrados quando a marca muda
  const handleBrandChange = (brandId: string) => {
    form.setValue("brandId", brandId);
    form.setValue("modelId", ""); // Reseta a seleção de modelo
    form.setValue("versionId", ""); // Reseta a seleção de versão
    
    if (brandId) {
      const parsedBrandId = parseInt(brandId);
      setFilteredModels(models.filter(model => model.brandId === parsedBrandId));
    } else {
      setFilteredModels([]);
    }
    
    setFilteredVersions([]);
  };
  
  // Atualiza versões filtradas quando o modelo muda
  const handleModelChange = (modelId: string) => {
    form.setValue("modelId", modelId);
    form.setValue("versionId", ""); // Reseta a seleção de versão
    
    if (modelId) {
      const parsedModelId = parseInt(modelId);
      setFilteredVersions(versions.filter(version => version.modelId === parsedModelId));
    } else {
      setFilteredVersions([]);
    }
  };
  
  // Formata um valor de entrada como moeda brasileira e retorna o valor formatado
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo exceto números
    let numericValue = value.replace(/\D/g, '');
    
    // Converte para centavos (divide por 100 para manter decimais)
    const cents = parseInt(numericValue) / 100;
    
    // Formata como moeda brasileira sem o símbolo
    if (cents === 0) return '';
    
    return formatBRCurrency(cents);
  };
  
  // Formatação do preço público sem cálculos automáticos de descontos
  const handlePublicPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Remove o símbolo R$ e espaço, se presente
    const cleanValue = rawValue.replace(/^R\$\s?/, '');
    
    // Formata o valor
    const formattedValue = formatCurrencyInput(cleanValue);
    
    // Define o valor formatado no campo
    form.setValue("publicPrice", formattedValue);
    
    // Não calculamos mais os preços automaticamente para PCD e Taxi
    // Deixamos esses campos vazios conforme solicitado
  };
  
  // Função para formatar valores em campos monetários
  const formatMoneyField = (name: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Remove o símbolo R$ e espaço, se presente
    const cleanValue = rawValue.replace(/^R\$\s?/, '');
    
    // Formata o valor
    const formattedValue = formatCurrencyInput(cleanValue);
    
    // Define o valor formatado no campo
    form.setValue(name, formattedValue);
  };
  
  // Função de submissão do formulário simplificada e robusta
  const onSubmit = async (data: FormValues) => {
    // Garante que não estamos tentando reenviar um formulário já em submissão
    if (isSubmitting) {
      console.log("Formulário já está sendo enviado, ignorando chamada duplicada");
      return;
    }
    
    try {
      // Força o estado de submissão como true
      setIsSubmitting(true);
      console.log("Form submitted with values:", data);
      console.log("isEditing:", isEditing, "id:", id);
      
      // Verifica se os valores obrigatórios estão presentes
      if (!data.brandId || !data.modelId || !data.versionId) {
        throw new Error("Marca, modelo e versão são campos obrigatórios.");
      }
      
      // Preparar dados para o backend
      const vehicleData = {
        brandId: parseInt(data.brandId),
        modelId: parseInt(data.modelId),
        versionId: parseInt(data.versionId),
        colorId: data.colorId && data.colorId !== "0" ? parseInt(data.colorId) : null,
        year: parseInt(String(data.year)),
        publicPrice: parseBRCurrency(data.publicPrice),
        situation: data.situation,
        // Garantir que description tenha pelo menos 10 caracteres
        description: data.description ? data.description : 
          (data.engine ? data.engine + " - Características padrão do veículo" : 
           "Veículo padrão - Características a serem definidas posteriormente"),
        engine: data.engine,
        fuelType: data.fuelType,
        transmission: data.transmission,
        isActive: data.isActive,
        pcdIpiIcms: parseBRCurrency(data.pcdIpiIcms),
        pcdIpi: parseBRCurrency(data.pcdIpi),
        taxiIpiIcms: parseBRCurrency(data.taxiIpiIcms),
        taxiIpi: parseBRCurrency(data.taxiIpi)
      };
      
      console.log("Preparando para enviar dados para a API:", vehicleData);
      
      // Adicionar logs detalhados para depuração dos campos de marca, modelo e versão
      console.log("DEPURAÇÃO - Valores sendo enviados:");
      console.log("brandId:", vehicleData.brandId, "tipo:", typeof vehicleData.brandId);
      console.log("modelId:", vehicleData.modelId, "tipo:", typeof vehicleData.modelId);
      console.log("versionId:", vehicleData.versionId, "tipo:", typeof vehicleData.versionId);
      
      // Tentativa de submissão direta com fetch para diagnóstico
      try {
        const endpoint = isEditing ? `/api/vehicles/${id}` : "/api/vehicles";
        const method = isEditing ? "PATCH" : "POST";
        
        console.log(`Enviando requisição ${method} para ${endpoint}`);
        console.log("Dados enviados:", JSON.stringify(vehicleData, null, 2));
        
        // Define um timeout para evitar que a requisição fique pendente indefinidamente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
        
        const response = await fetch(endpoint, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(vehicleData),
          credentials: "include",
          signal: controller.signal
        });
        
        // Limpa o timeout se a resposta chegou
        clearTimeout(timeoutId);
        
        console.log("Resposta da API:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro da API (${response.status}): ${errorText}`);
          throw new Error(`Erro ao salvar: ${response.status} ${errorText || response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log("Dados da resposta:", responseData);
        
        // Feedback de sucesso
        toast({
          title: isEditing ? "Veículo atualizado" : "Veículo criado",
          description: isEditing 
            ? "As alterações foram salvas com sucesso." 
            : "O novo veículo foi cadastrado com sucesso."
        });
        
        // Invalidar cache para garantir que os dados mais recentes sejam carregados
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        
        if (isEditing) {
          // Invalidar a consulta específica deste veículo para forçar recarregar
          queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}`] });
          
          // Atualizar os dados no formulário com os valores recém-salvos
          toast({
            title: "Dados atualizados",
            description: "Os valores foram salvos. Recarregando formulário com dados atualizados.",
          });
          
          // Recarregar os dados do veículo após um pequeno delay
          setTimeout(async () => {
            try {
              // Buscar os dados atualizados diretamente
              const response = await fetch(`/api/vehicles/${id}`);
              if (!response.ok) throw new Error("Falha ao recarregar dados do veículo");
              
              const updatedVehicle = await response.json();
              
              // Garantir que todos os estados e dados do formulário sejam atualizados
              if (updatedVehicle) {
                console.log("Dados atualizados recebidos:", updatedVehicle);
                
                // Verificar estrutura do objeto updatedVehicle
                console.log("ESTRUTURA updateVehicle:", 
                  "versionId=", updatedVehicle.versionId,
                  "version=", updatedVehicle.version,
                  "version.modelId=", updatedVehicle.version?.modelId,
                  "version.model=", updatedVehicle.version?.model,
                  "version.model.brandId=", updatedVehicle.version?.model?.brandId
                );
                
                // Atualizar os nomes selecionados
                const brandName = brands.find(b => b.id === updatedVehicle.version.model.brandId)?.name || "";
                const modelName = models.find(m => m.id === updatedVehicle.version.modelId)?.name || "";
                const versionName = versions.find(v => v.id === updatedVehicle.versionId)?.name || "";
                
                console.log("Nomes atualizados:", {brandName, modelName, versionName});
                
                setSelectedBrandName(brandName);
                setSelectedModelName(modelName);
                setSelectedVersionName(versionName);
                
                // Atualizar os modelos e versões filtrados
                setFilteredModels(models.filter(model => model.brandId === updatedVehicle.version.model.brandId));
                setFilteredVersions(versions.filter(version => version.modelId === updatedVehicle.version.modelId));
                
                // Atualizar o formulário com os valores mais recentes
                form.reset({
                  brandId: updatedVehicle.version.model.brandId.toString(),
                  modelId: updatedVehicle.version.modelId.toString(),
                  versionId: updatedVehicle.versionId.toString(),
                  colorId: updatedVehicle.colorId ? updatedVehicle.colorId.toString() : "",
                  year: updatedVehicle.year,
                  publicPrice: formatBRCurrency(Number(updatedVehicle.publicPrice)),
                  situation: updatedVehicle.situation,
                  description: updatedVehicle.description,
                  engine: updatedVehicle.engine,
                  fuelType: updatedVehicle.fuelType,
                  transmission: updatedVehicle.transmission,
                  isActive: updatedVehicle.isActive,
                  pcdIpiIcms: formatBRCurrency(Number(updatedVehicle.pcdIpiIcms)),
                  pcdIpi: formatBRCurrency(Number(updatedVehicle.pcdIpi)),
                  taxiIpiIcms: formatBRCurrency(Number(updatedVehicle.taxiIpiIcms)),
                  taxiIpi: formatBRCurrency(Number(updatedVehicle.taxiIpi))
                });
                
                toast({
                  title: "Formulário atualizado",
                  description: "Dados atualizados com sucesso.",
                });
              }
            } catch (error) {
              console.error("Erro ao recarregar dados do veículo:", error);
              toast({
                title: "Erro ao recarregar",
                description: "Não foi possível recarregar os dados atualizados.",
                variant: "destructive"
              });
              
              // Navegar de volta para a lista em caso de erro
              navigate("/vehicles");
            } finally {
              setDataWasLoaded(true);
            }
          }, 800);
        } else {
          // Se estiver criando um novo, limpe o formulário
          form.reset({
            brandId: "",
            modelId: "",
            versionId: "",
            colorId: "",
            year: new Date().getFullYear(),
            publicPrice: "0",
            situation: "available",
            description: "",
            engine: "",
            fuelType: "flex",
            transmission: "automatic",
            isActive: true,
            pcdIpiIcms: "",
            pcdIpi: "",
            taxiIpiIcms: "",
            taxiIpi: ""
          });
          
          // Limpar os modelos e versões filtrados
          setFilteredModels([]);
          setFilteredVersions([]);
          
          // Rolar para o topo do formulário
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          toast({
            title: "Formulário limpo",
            description: "O formulário foi limpo para um novo cadastro.",
          });
        }
        
      } catch (error) {
        console.error("Erro na requisição fetch:", error);
        
        // Se for um erro de timeout (abortado), mostrar mensagem específica
        if (error instanceof Error && error.name === 'AbortError') {
          toast({
            title: "Erro de timeout",
            description: "A operação demorou muito para completar. Tente novamente.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error("Erro ao salvar veículo:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error 
          ? error.message 
          : "Falha ao comunicar com o servidor. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      // Garante que o estado de submissão seja resetado após um breve delay
      // para evitar problemas de estado
      setTimeout(() => {
        console.log('Resetando estado de submissão');
        setIsSubmitting(false);
      }, 500);
    }
  };
  
  if (isEditing && isLoadingVehicle) {
    return <div>Carregando...</div>;
  }
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <Link href="/vehicles" className="mr-4">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEditing ? "Editar Veículo" : "Novo Veículo"}
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Veículo" : "Cadastrar Novo Veículo"}</CardTitle>
          <CardDescription>
            {isEditing 
              ? "Atualize as informações do veículo"
              : "Preencha os campos para adicionar um novo veículo"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic">
            <TabsList className="mb-6">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="details">Detalhes Técnicos</TabsTrigger>
              <TabsTrigger value="pricing">Preços Especiais</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="basic" className="space-y-6">
                  {/* Conteúdo da aba Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Campo: Marca */}
                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <Select 
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                            onValueChange={(value) => {
                              handleBrandChange(value);
                              // Atualizar nome ao selecionar
                              const brandName = brands.find(b => b.id.toString() === value)?.name || "";
                              setSelectedBrandName(brandName);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="relative">
                                {selectedBrandName ? (
                                  <div className="absolute inset-0 flex items-center px-3 font-normal">
                                    {selectedBrandName}
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Selecione uma marca" />
                                )}
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
                          <FormMessage />
                          {field.value && !selectedBrandName && <div className="text-sm text-gray-500 pt-1">Marca selecionada: {brands.find(b => b.id.toString() === field.value)?.name}</div>}
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Modelo */}
                    <FormField
                      control={form.control}
                      name="modelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <Select 
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                            onValueChange={(value) => {
                              handleModelChange(value);
                              // Atualizar nome ao selecionar
                              const modelName = models.find(m => m.id.toString() === value)?.name || "";
                              setSelectedModelName(modelName);
                            }}
                            disabled={!form.getValues("brandId")}
                          >
                            <FormControl>
                              <SelectTrigger className="relative">
                                {selectedModelName ? (
                                  <div className="absolute inset-0 flex items-center px-3 font-normal">
                                    {selectedModelName}
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Selecione um modelo" />
                                )}
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
                          {field.value && !selectedModelName && <div className="text-sm text-gray-500 pt-1">Modelo selecionado: {models.find(m => m.id.toString() === field.value)?.name}</div>}
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Versão */}
                    <FormField
                      control={form.control}
                      name="versionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Versão</FormLabel>
                          <Select 
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Atualizar nome ao selecionar
                              const versionName = versions.find(v => v.id.toString() === value)?.name || "";
                              setSelectedVersionName(versionName);
                            }}
                            disabled={!form.getValues("modelId")}
                          >
                            <FormControl>
                              <SelectTrigger className="relative">
                                {selectedVersionName ? (
                                  <div className="absolute inset-0 flex items-center px-3 font-normal">
                                    {selectedVersionName}
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Selecione uma versão" />
                                )}
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
                          {field.value && !selectedVersionName && <div className="text-sm text-gray-500 pt-1">Versão selecionada: {versions.find(v => v.id.toString() === field.value)?.name}</div>}
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo de cor removido - será null por padrão */}
                    
                    {/* Campo: Ano */}
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Preço Público */}
                    <FormField
                      control={form.control}
                      name="publicPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Público</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                              <Input 
                                className="pl-8" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  handlePublicPriceChange(e);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Situação */}
                    <FormField
                      control={form.control}
                      name="situation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Situação</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a situação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SITUATIONS.map((situation) => (
                                <SelectItem key={situation.value} value={situation.value}>
                                  {situation.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Campo: Descrição */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva as características do veículo" 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Campo: Status Ativo */}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Status Ativo/Inativo</FormLabel>
                          <FormDescription>
                            {field.value ? 'O veículo está ativo e será exibido no sistema.' : 'O veículo está inativo e não será exibido no sistema.'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="details" className="space-y-6">
                  {/* Conteúdo da aba Detalhes Técnicos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Campo: Motor */}
                    <FormField
                      control={form.control}
                      name="engine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motor</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 1.0 TSI" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Combustível */}
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Combustível</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de combustível" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FUEL_TYPES.map((fuel) => (
                                <SelectItem key={fuel.value} value={fuel.value}>
                                  {fuel.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Câmbio */}
                    <FormField
                      control={form.control}
                      name="transmission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Câmbio</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de câmbio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TRANSMISSION_TYPES.map((transmission) => (
                                <SelectItem key={transmission.value} value={transmission.value}>
                                  {transmission.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="pricing" className="space-y-6">
                  {/* Conteúdo da aba Preços Especiais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campo: PCD (IPI+ICMS) */}
                    <FormField
                      control={form.control}
                      name="pcdIpiIcms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PCD (IPI+ICMS)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                              <Input 
                                className="pl-8" 
                                {...field} 
                                onChange={formatMoneyField("pcdIpiIcms")}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: PCD (IPI) */}
                    <FormField
                      control={form.control}
                      name="pcdIpi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PCD (IPI)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                              <Input 
                                className="pl-8" 
                                {...field} 
                                onChange={formatMoneyField("pcdIpi")}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Taxi (IPI+ICMS) */}
                    <FormField
                      control={form.control}
                      name="taxiIpiIcms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxi (IPI+ICMS)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                              <Input 
                                className="pl-8" 
                                {...field} 
                                onChange={formatMoneyField("taxiIpiIcms")}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campo: Taxi (IPI) */}
                    <FormField
                      control={form.control}
                      name="taxiIpi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxi (IPI)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                              <Input 
                                className="pl-8" 
                                {...field} 
                                onChange={formatMoneyField("taxiIpi")}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <div className="flex justify-end space-x-2">
                  <Link href="/vehicles">
                    <Button variant="outline" type="button" disabled={isSubmitting}>
                      Cancelar
                    </Button>
                  </Link>
                  <Button 
                    type="button"
                    variant="default"
                    disabled={isSubmitting}
                    onClick={() => {
                      // Forçar a submissão do formulário manualmente utilizando outra abordagem
                      setIsSubmitting(true);
                      
                      // Tentativa de salvar diretamente
                      const formData = form.getValues();
                      onSubmit(formData);
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        {isEditing ? "Salvando..." : "Cadastrando..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}