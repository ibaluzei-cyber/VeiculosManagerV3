import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, FileText, Printer, LayoutTemplate } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";

interface Brand {
  id: number;
  name: string;
}

interface Model {
  id: number;
  name: string;
  brandId: number;
}

interface Version {
  id: number;
  name: string;
  modelId: number;
  model?: {
    name: string;
    brand?: {
      name: string;
    }
  }
}

interface Color {
  id: number;
  name: string;
  paintType?: {
    name: string;
  };
  imageUrl?: string;
}

interface Vehicle {
  id: number;
  versionId: number;
  year: number;
  fuelType: string;
  publicPrice: number;
  description?: string;
  pcdIpi: number;
  pcdIpiIcms: number;
  taxiIpi: number;
  taxiIpiIcms: number;
}

interface VersionColor {
  id: number;
  versionId: number;
  colorId: number;
  color?: Color;
  imageUrl?: string;
}

interface DirectSale {
  id: number;
  name: string;
  discountPercentage: number;
  brandId: number;
}

interface VersionOptional {
  id: number;
  versionId: number;
  optionalId: number;
  price: number;
  optional?: {
    id: number;
    name: string;
    description: string;
  };
}

export default function Configurator2() {
  const { user } = useAuth();
  const hasAccess = user?.role?.name === "Administrador";

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [selectedColorId, setSelectedColorId] = useState<string>("");
  const [selectedDirectSaleId, setSelectedDirectSaleId] = useState<string>("");
  const [selectedOptionals, setSelectedOptionals] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("equipment");
  
  // Valores calculados
  const [publicPrice, setPublicPrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [optionalsTotal, setOptionalsTotal] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  // Isenções
  const [pcdIpi, setPcdIpi] = useState(0);
  const [taxiIpiIcms, setTaxiIpiIcms] = useState(0);
  const [pcdIpiIcms, setPcdIpiIcms] = useState(0);
  const [taxiIpi, setTaxiIpi] = useState(0);
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(null);
  
  // Função para lidar com seleção de cartões de preço
  const handlePriceCardClick = (priceType: string) => {
    setSelectedPriceType(selectedPriceType === priceType ? null : priceType);
  };

  // Fetch data
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: allModels = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });

  const { data: allVersions = [] } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
  });

  const { data: allColors = [] } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
  });

  const { data: allVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: directSales = [] } = useQuery<DirectSale[]>({
    queryKey: ["/api/direct-sales"],
  });

  const { data: versionColors = [] } = useQuery<VersionColor[]>({
    queryKey: ["/api/version-colors", selectedVersionId],
    queryFn: async () => {
      if (!selectedVersionId) return [];
      console.log("Buscando cores para versão:", selectedVersionId);
      const response = await fetch(`/api/version-colors?versionId=${selectedVersionId}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar cores: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedVersionId,
  });

  const { data: versionOptionals = [] } = useQuery<VersionOptional[]>({
    queryKey: ["/api/version-optionals", selectedVersionId],
    queryFn: async () => {
      if (!selectedVersionId) return [];
      console.log("Buscando opcionais para versão:", selectedVersionId);
      const response = await fetch(`/api/version-optionals?versionId=${selectedVersionId}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar opcionais: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedVersionId,
  });

  // Filtered data
  const filteredModels = allModels.filter(model => 
    selectedBrandId ? model.brandId === parseInt(selectedBrandId) : true
  );

  const filteredVersions = allVersions.filter(version => 
    selectedModelId ? version.modelId === parseInt(selectedModelId) : true
  );

  // Filtra apenas as cores disponíveis para a versão selecionada
  const availableColors = selectedVersionId 
    ? versionColors
        .filter((vc: VersionColor) => vc.versionId === parseInt(selectedVersionId))
        .map((vc: VersionColor) => {
          const color = allColors.find(c => c.id === vc.colorId);
          return { ...vc, color };
        })
    : [];

  const availableDirectSales = directSales.filter(ds => 
    !selectedBrandId || ds.brandId === 0 || ds.brandId === parseInt(selectedBrandId)
  );

  // Buscar o veículo selecionado na lista de veículos
  const selectedVehicle = selectedVersionId 
    ? allVehicles.find(v => v.versionId === parseInt(selectedVersionId)) 
    : null;

  const selectedVersion = selectedVersionId 
    ? allVersions.find(v => v.id === parseInt(selectedVersionId)) 
    : null;

  const selectedVehicleTitle = selectedVersion 
    ? `${selectedVersion.model?.brand?.name || ""} ${selectedVersion.model?.name || ""} ${selectedVersion.name} ${selectedVehicle?.fuelType || ""} ${selectedVehicle?.year || ""}` 
    : "";

  const selectedColorImage = selectedColorId && versionColors.length > 0
    ? versionColors.find(vc => vc.colorId === parseInt(selectedColorId))?.imageUrl || ""
    : "";

  // Quando mudamos de veículo, atualizar os preços
  useEffect(() => {
    if (selectedVehicle) {
      // Usar diretamente o preço público do veículo
      setPublicPrice(selectedVehicle.publicPrice);
      
      // Atualizar preços de isenção
      setPcdIpi(selectedVehicle.pcdIpi);
      setPcdIpiIcms(selectedVehicle.pcdIpiIcms);
      setTaxiIpiIcms(selectedVehicle.taxiIpiIcms);
      setTaxiIpi(selectedVehicle.taxiIpi);
      
      // Cálculo de desconto
      const directSale = selectedDirectSaleId 
        ? directSales.find(ds => ds.id === parseInt(selectedDirectSaleId)) 
        : null;
      
      const calculatedDiscountPercentage = directSale ? directSale.discountPercentage : 0;
      const calculatedDiscountAmount = (selectedVehicle.publicPrice * calculatedDiscountPercentage) / 100;
      
      setDiscountPercentage(calculatedDiscountPercentage);
      setDiscountAmount(calculatedDiscountAmount);
      
      // Cálculo de opcionais
      const selectedOptionalsTotal = versionOptionals
        .filter(opt => selectedOptionals.includes(opt.optionalId))
        .reduce((sum, opt) => sum + opt.price, 0);
      
      setOptionalsTotal(selectedOptionalsTotal);
      
      // Preço base para cálculo final
      let precoBaseCalculo = selectedVehicle.publicPrice;
      
      // Se tiver um tipo de preço selecionado, usa ele como base
      if (selectedPriceType) {
        switch (selectedPriceType) {
          case 'pcdIpi':
            precoBaseCalculo = selectedVehicle.pcdIpi; 
            break;
          case 'taxiIpiIcms':
            precoBaseCalculo = selectedVehicle.taxiIpiIcms;
            break;
          case 'pcdIpiIcms':
            precoBaseCalculo = selectedVehicle.pcdIpiIcms;
            break;
          case 'taxiIpi':
            precoBaseCalculo = selectedVehicle.taxiIpi;
            break;
        }
      }
      
      // Cálculo do preço final
      let calculatedFinalPrice = selectedVehicle.publicPrice - calculatedDiscountAmount + surchargeAmount + selectedOptionalsTotal;
      
      // Se houver um tipo de preço selecionado, substitui o preço base pelo preço específico
      if (selectedPriceType) {
        switch (selectedPriceType) {
          case 'pcdIpi':
            calculatedFinalPrice = pcdIpi - calculatedDiscountAmount + surchargeAmount + selectedOptionalsTotal;
            break;
          case 'taxiIpiIcms':
            calculatedFinalPrice = taxiIpiIcms - calculatedDiscountAmount + surchargeAmount + selectedOptionalsTotal;
            break;
          case 'pcdIpiIcms':
            calculatedFinalPrice = pcdIpiIcms - calculatedDiscountAmount + surchargeAmount + selectedOptionalsTotal;
            break;
          case 'taxiIpi':
            calculatedFinalPrice = taxiIpi - calculatedDiscountAmount + surchargeAmount + selectedOptionalsTotal;
            break;
        }
      }
      
      setFinalPrice(calculatedFinalPrice);
    }
  }, [selectedVehicle, selectedDirectSaleId, surchargeAmount, selectedOptionals, versionOptionals, directSales]);

  // Limpeza de campos dependentes
  useEffect(() => {
    if (selectedBrandId) {
      setSelectedModelId("");
      setSelectedVersionId("");
      setSelectedColorId("");
      setSelectedDirectSaleId("");
      setSelectedOptionals([]);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (selectedModelId) {
      setSelectedVersionId("");
      setSelectedColorId("");
      setSelectedOptionals([]);
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (selectedVersionId) {
      setSelectedColorId("");
      setSelectedOptionals([]);
    }
  }, [selectedVersionId]);

  const handleBrandChange = (value: string) => {
    setSelectedBrandId(value);
  };

  const handleModelChange = (value: string) => {
    setSelectedModelId(value);
  };

  const handleVersionChange = (value: string) => {
    setSelectedVersionId(value);
  };

  const handleColorChange = (value: string) => {
    setSelectedColorId(value);
  };

  const handleDirectSaleChange = (value: string) => {
    setSelectedDirectSaleId(value);
  };

  const handleOptionalToggle = (optionalId: number) => {
    setSelectedOptionals(prev => 
      prev.includes(optionalId)
        ? prev.filter(id => id !== optionalId)
        : [...prev, optionalId]
    );
  };

  // Traduzir tipo de combustível
  const translateFuelType = (fuelType: string | undefined) => {
    if (!fuelType) return "";
    
    const translations: Record<string, string> = {
      "gasoline": "GASOLINA",
      "ethanol": "ETANOL",
      "flex": "FLEX",
      "diesel": "DIESEL",
      "electric": "ELÉTRICO",
      "hybrid": "HÍBRIDO"
    };
    
    return translations[fuelType.toLowerCase()] || fuelType.toUpperCase();
  };

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">CONFIGURADOR NOVO</h1>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Dropdown de Marca */}
        <div className="w-full">
          <div className="bg-[#082a58] text-white px-4 py-2 font-semibold mb-1 uppercase">
            MARCA
          </div>
          <Select value={selectedBrandId} onValueChange={handleBrandChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="SELECIONE UMA MARCA" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>MARCAS</SelectLabel>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown de Modelo */}
        <div className="w-full">
          <div className="bg-[#082a58] text-white px-4 py-2 font-semibold mb-1 uppercase">
            MODELO
          </div>
          <Select 
            value={selectedModelId} 
            onValueChange={handleModelChange}
            disabled={!selectedBrandId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="SELECIONE UM MODELO" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>MODELOS</SelectLabel>
                {filteredModels.map(model => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    {model.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown de Versão */}
        <div className="w-full">
          <div className="bg-[#082a58] text-white px-4 py-2 font-semibold mb-1 uppercase">
            VERSÃO
          </div>
          <Select 
            value={selectedVersionId} 
            onValueChange={handleVersionChange}
            disabled={!selectedModelId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="SELECIONE UMA VERSÃO" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>VERSÕES</SelectLabel>
                {filteredVersions.map(version => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    {version.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedVersionId && (
        <>
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold uppercase">{selectedVehicleTitle}</h2>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Coluna da esquerda - Preços */}
            <div className="col-span-3">
              <div className="space-y-1">
                <div className="flex">
                  <div className="bg-[#082a58] text-white px-4 py-2 w-40 font-semibold uppercase">PREÇO PÚBLICO</div>
                  <div className="border px-4 py-2 flex-1 text-right">{formatCurrency(publicPrice)}</div>
                </div>
                <div 
                  className={`flex cursor-pointer ${selectedPriceType === 'pcdIpi' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handlePriceCardClick('pcdIpi')}
                >
                  <div className="bg-[#082a58] text-white px-4 py-2 w-40 font-semibold uppercase">PCD IPI</div>
                  <div className="border px-4 py-2 flex-1 text-right">{formatCurrency(pcdIpi)}</div>
                </div>
                <div 
                  className={`flex cursor-pointer ${selectedPriceType === 'taxiIpiIcms' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handlePriceCardClick('taxiIpiIcms')}
                >
                  <div className="bg-[#082a58] text-white px-4 py-2 w-40 font-semibold uppercase">TAXI IPI/ICMS</div>
                  <div className="border px-4 py-2 flex-1 text-right">{formatCurrency(taxiIpiIcms)}</div>
                </div>
                <div 
                  className={`flex cursor-pointer ${selectedPriceType === 'pcdIpiIcms' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handlePriceCardClick('pcdIpiIcms')}
                >
                  <div className="bg-[#082a58] text-white px-4 py-2 w-40 font-semibold uppercase">PCD IPI/ICMS</div>
                  <div className="border px-4 py-2 flex-1 text-right">{formatCurrency(pcdIpiIcms)}</div>
                </div>
                <div 
                  className={`flex cursor-pointer ${selectedPriceType === 'taxiIpi' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handlePriceCardClick('taxiIpi')}
                >
                  <div className="bg-[#082a58] text-white px-4 py-2 w-40 font-semibold uppercase">TAXI IPI</div>
                  <div className="border px-4 py-2 flex-1 text-right">{formatCurrency(taxiIpi)}</div>
                </div>
              </div>
            </div>

            {/* Coluna do meio - Pinturas e Imagem */}
            <div className="col-span-5">
              <div className="flex flex-col items-center">
                {/* Dropdown de Pintura */}
                <div className="mb-4 w-full max-w-md">
                  <Select 
                    value={selectedColorId} 
                    onValueChange={handleColorChange}
                    disabled={!selectedVersionId || availableColors.length === 0}
                  >
                    <SelectTrigger className="w-full border-2 border-gray-300 rounded-md">
                      <div className="flex items-center justify-between w-full">
                        <span>PINTURAS</span>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>CORES DISPONÍVEIS</SelectLabel>
                        {availableColors.map(item => (
                          <SelectItem key={item.colorId} value={item.colorId.toString()}>
                            {item.color?.name.toUpperCase()} - {item.color?.paintType?.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Imagem do Veículo */}
                <div className="mt-4 w-full h-64 flex items-center justify-center">
                  {selectedColorImage ? (
                    <img 
                      src={selectedColorImage} 
                      alt="Veículo" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : selectedVersionId ? (
                    <div className="text-center text-gray-500">
                      <p>SELECIONE UMA COR PARA VER A IMAGEM DO VEÍCULO</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p>SELECIONE UM VEÍCULO PARA VER A IMAGEM</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna da direita - Descontos e Resumo */}
            <div className="col-span-4">
              {/* Dropdown de Descontos */}
              <div className="mb-6">
                <Select 
                  value={selectedDirectSaleId} 
                  onValueChange={handleDirectSaleChange}
                  disabled={!selectedVersionId}
                >
                  <SelectTrigger className="w-full border-2 border-gray-300 rounded-md">
                    <div className="flex items-center justify-between w-full">
                      <span>DESCONTOS V.D.</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>DESCONTOS DISPONÍVEIS</SelectLabel>
                      <SelectItem value="0">SEM DESCONTO</SelectItem>
                      {availableDirectSales.map(sale => (
                        <SelectItem key={sale.id} value={sale.id.toString()}>
                          {sale.name.toUpperCase()} - {sale.discountPercentage}%
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Informações de Desconto */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="font-medium text-sm mb-1">DESCONTOS %</div>
                    <div className="border p-2 text-right">{typeof discountPercentage === 'number' ? discountPercentage.toFixed(2) : '0.00'}%</div>
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-1">ÁGIO</div>
                    <div className="border p-2 text-right">{formatCurrency(surchargeAmount)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-medium text-sm mb-1">DESCONTOS R$</div>
                    <div className="border p-2 text-right">{formatCurrency(discountAmount)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-1">QUANTIDADE</div>
                    <div className="border p-2 text-right">1</div>
                  </div>
                </div>
              </div>

              {/* Resumo e Valores Finais */}
              <div className="mb-6">
                <div className="border-2 border-gray-300 rounded-md p-4">
                  <h3 className="font-bold text-center mb-4 uppercase">RESUMO E VALORES FINAIS</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium">Preço Base</div>
                      <div className="font-bold">{formatCurrency(publicPrice)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Pintura</div>
                      <div className="font-bold">{formatCurrency(0)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-sm font-medium">Opcionais</div>
                      <div className="font-bold">{formatCurrency(optionalsTotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Total</div>
                      <div className="font-bold">{formatCurrency(finalPrice)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Desc. {discountPercentage > 0 ? `${discountPercentage}%` : "0%"}</div>
                      <div className="font-bold">{formatCurrency(discountAmount)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preço Final */}
              <div className="bg-[#082a58] text-white p-4 text-center">
                <div className="uppercase font-bold mb-1">PREÇO FINAL</div>
                <div className="text-xl font-bold">{formatCurrency(finalPrice)}</div>
              </div>
            </div>
          </div>

          {/* Tabs de Equipamentos e Itens de Série */}
          <div className="mt-8">
            <Tabs 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="equipment" className="uppercase">EQUIPAMENTOS</TabsTrigger>
                <TabsTrigger value="standard" className="uppercase">ITENS DE SÉRIE</TabsTrigger>
              </TabsList>
              
              <TabsContent value="equipment" className="border p-4 rounded-b-md">
                {versionOptionals && versionOptionals.length > 0 ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold uppercase">OPCIONAIS</h3>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                    
                    {versionOptionals.map((opt) => (
                      <div key={opt.id} className="border mb-4 p-4 rounded">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            id={`optional-${opt.id}`} 
                            checked={selectedOptionals.includes(opt.optionalId)}
                            onCheckedChange={() => handleOptionalToggle(opt.optionalId)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <Label 
                                htmlFor={`optional-${opt.id}`} 
                                className="font-bold cursor-pointer uppercase"
                              >
                                {opt.optional?.name}
                              </Label>
                              <div className="font-bold text-right">
                                {formatCurrency(opt.price)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{opt.optional?.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    NÃO HÁ EQUIPAMENTOS OPCIONAIS DISPONÍVEIS PARA ESTA VERSÃO
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="standard" className="border p-4 rounded-b-md">
                {selectedVehicle?.description ? (
                  <div className="whitespace-pre-wrap text-gray-700 uppercase">
                    {selectedVehicle.description}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    INFORMAÇÕES SOBRE ITENS DE SÉRIE NÃO DISPONÍVEIS
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Botões de Ação */}
          <div className="mt-8 flex justify-center gap-6">
            <Button 
              className="bg-[#082a58] text-white hover:bg-[#0a3675] px-8 py-2 uppercase"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              VISUALIZAR/IMPRIMIR
            </Button>
            
            <Button 
              className="bg-[#082a58] text-white hover:bg-[#0a3675] px-8 py-2 uppercase"
            >
              <LayoutTemplate className="mr-2 h-4 w-4" />
              GERAR ANÚNCIO
            </Button>
          </div>
        </>
      )}
    </div>
  );
}