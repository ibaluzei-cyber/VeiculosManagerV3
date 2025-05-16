import React from 'react';
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brand, Model, Version, Color, Vehicle } from "@/lib/types";
import { formatCurrency, formatConfiguratorCurrency } from "@/lib/formatters";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMobile } from "@/hooks/use-mobile";

function Configurator() {
  const isMobile = useMobile();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [markupAmount, setMarkupAmount] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [selectedTab, setSelectedTab] = useState("equipamentos");
  const [selectedDirectSaleId, setSelectedDirectSaleId] = useState("");

  // Fetch brands
  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    queryFn: getQueryFn()
  });

  // Fetch models
  const { data: allModels = [], isLoading: modelsLoading } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    queryFn: getQueryFn()
  });

  // Fetch versions
  const { data: allVersions = [], isLoading: versionsLoading } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
    queryFn: getQueryFn()
  });

  // Fetch colors
  const { data: allColors = [], isLoading: colorsLoading } = useQuery<Color[]>({
    queryKey: ["/api/colors"],
    queryFn: getQueryFn()
  });

  // Fetch vehicles
  const { data: allVehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: getQueryFn()
  });
  
  // Fetch direct sales
  const { data: directSales = [] } = useQuery<any[]>({
    queryKey: ["/api/direct-sales"],
    queryFn: getQueryFn()
  });
  
  // Fetch version colors para a versão selecionada
  const { data: versionColors = [] } = useQuery<any[]>({
    queryKey: ["/api/version-colors", selectedVersionId],
    queryFn: getQueryFn({
      queryKey: ["/api/version-colors"],
      params: selectedVersionId ? { versionId: selectedVersionId } : undefined
    }),
    enabled: !!selectedVersionId,
    retry: 3, // Tentar novamente em caso de falha
    retryDelay: 1000, // Esperar 1 segundo entre as tentativas
  });
  
  // Fetch version optionals para a versão selecionada
  const { data: versionOptionals = [] } = useQuery<any[]>({
    queryKey: ["/api/version-optionals", selectedVersionId],
    queryFn: getQueryFn({
      queryKey: ["/api/version-optionals"],
      params: selectedVersionId ? { versionId: selectedVersionId } : undefined
    }),
    enabled: !!selectedVersionId,
    retry: 3, // Tentar novamente em caso de falha
    retryDelay: 1000, // Esperar 1 segundo entre as tentativas
  });
  
  // Debug logs
  useEffect(() => {
    console.log("Brands loaded:", brands.length);
    console.log("Models loaded:", allModels.length);
    console.log("Versions loaded:", allVersions.length);
    console.log("Colors loaded:", allColors.length);
    console.log("Vehicles loaded:", allVehicles.length);
    console.log("Direct Sales loaded:", directSales.length);
    if (versionColors.length > 0) {
      console.log("Version colors loaded:", versionColors);
    }
    if (versionOptionals.length > 0) {
      console.log("Version optionals loaded:", versionOptionals);
    }
    if (directSales.length > 0) {
      console.log("Direct Sales data:", directSales);
    }
  }, [brands, allModels, allVersions, allColors, allVehicles, versionColors, versionOptionals, directSales]);
  
  // Atualizar as cores disponíveis quando versionColors mudar
  useEffect(() => {
    if (versionColors && versionColors.length > 0 && selectedVersionId) {
      console.log("Atualizando cores disponíveis com base em versionColors");
      console.log("Version Colors recebido:", versionColors);
      
      // Extrai os IDs de cores dos versionColors QUE CORRESPONDEM à versão selecionada
      const colorIdsForVersion = versionColors
        .filter(vc => vc.versionId === parseInt(selectedVersionId))
        .map(vc => vc.colorId);
      
      console.log("IDs de cores associadas a esta versão:", colorIdsForVersion);
      
      // Filtra as cores disponíveis pelo ID
      const associatedColors = allColors.filter(c => colorIdsForVersion.includes(c.id));
      console.log("Cores associadas encontradas para mostrar:", associatedColors);
      
      setAvailableColors(associatedColors);
    } else {
      // Se não temos cores associadas ou versão selecionada, limpa as cores disponíveis
      setAvailableColors([]);
    }
  }, [versionColors, allColors, selectedVersionId]);

  // Filtered models based on selected brand
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  
  // Filtered versions based on selected model
  const [filteredVersions, setFilteredVersions] = useState<Version[]>([]);
  
  // Filtered colors for the selected version
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  
  // Selected optionals
  const [selectedOptionals, setSelectedOptionals] = useState<number[]>([]);
  const [optionalsPrice, setOptionalsPrice] = useState(0);
  
  // Price calculations
  const [basePrice, setBasePrice] = useState(0);
  const [colorPrice, setColorPrice] = useState(0);
  const [pcdIpiIcmsPrice, setPcdIpiIcmsPrice] = useState(0);
  const [pcdIpiPrice, setPcdIpiPrice] = useState(0);
  const [taxiIpiIcmsPrice, setTaxiIpiIcmsPrice] = useState(0);
  const [taxiIpiPrice, setTaxiIpiPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(null);
  
  // Select a brand
  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setSelectedModelId("");
    setSelectedVersionId("");
    setSelectedColorId("");
    setSelectedVehicle(null);
    
    // Resetar campos de desconto e ágio
    setSelectedDirectSaleId("0"); // Reset direct sale selection when brand changes
    handleDiscountPercentChange("0"); // Limpar desconto percentual
    handleDiscountAmountChange("0"); // Limpar desconto em valor
    setMarkupAmount("0"); // Limpar ágio
    
    if (brandId) {
      const brandModels = allModels.filter(model => model.brandId === parseInt(brandId));
      setFilteredModels(brandModels);
    } else {
      setFilteredModels([]);
    }
    
    console.log("Marca alterada: valores de desconto e ágio foram limpos");
  };
  
  // Select a model
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    setSelectedVersionId("");
    setSelectedColorId("");
    setSelectedVehicle(null);
    
    // Resetar campos de desconto e ágio
    setSelectedDirectSaleId("0"); // Reset direct sale selection when model changes
    handleDiscountPercentChange("0"); // Limpar desconto percentual
    handleDiscountAmountChange("0"); // Limpar desconto em valor
    setMarkupAmount("0"); // Limpar ágio
    
    if (modelId) {
      const modelVersions = allVersions.filter(version => version.modelId === parseInt(modelId));
      setFilteredVersions(modelVersions);
    } else {
      setFilteredVersions([]);
    }
    
    console.log("Modelo alterado: valores de desconto e ágio foram limpos");
  };
  
  // Select a version
  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId);
    setSelectedColorId("");
    
    // Resetar campos de desconto e ágio
    setSelectedDirectSaleId("0"); // Reset direct sale selection when version changes
    handleDiscountPercentChange("0"); // Limpar desconto percentual
    handleDiscountAmountChange("0"); // Limpar desconto em valor
    setMarkupAmount("0"); // Limpar ágio
    
    if (versionId) {
      const parsedVersionId = parseInt(versionId);
      
      console.log("Selected version ID:", parsedVersionId);
      console.log("Available vehicles:", allVehicles);
      console.log("Versão alterada: valores de desconto e ágio foram limpos");
      
      // Find vehicle with this version
      const vehicle = allVehicles.find(v => v.versionId === parsedVersionId);
      console.log("Found vehicle:", vehicle);
      
      // Se não encontrar um veículo com a versão selecionada, cria um veículo temporário
      // apenas para demonstração
      const demoVehicle = vehicle || {
        id: 999,
        versionId: parsedVersionId,
        year: 2025,
        publicPrice: 105990.00,
        situation: 'available',
        description: 'Veículo de demonstração',
        engine: '1.0',
        fuelType: 'flex',
        transmission: 'manual',
        isActive: true,
        pcdIpiIcms: 89915.07,
        pcdIpi: 102176.21,
        taxiIpiIcms: 89915.07,
        taxiIpi: 102176.21,
        version: {
          id: parsedVersionId,
          name: filteredVersions.find(v => v.id === parsedVersionId)?.name || 'Versão',
          model: {
            id: parseInt(selectedModelId),
            name: filteredModels.find(m => m.id === parseInt(selectedModelId))?.name || 'Modelo',
            brand: {
              id: parseInt(selectedBrandId),
              name: brands.find(b => b.id === parseInt(selectedBrandId))?.name || 'Marca'
            }
          }
        }
      } as any;
      
      setSelectedVehicle(demoVehicle);
      
      // Set price values
      setBasePrice(parseFloat(demoVehicle.publicPrice.toString()));
      setPcdIpiIcmsPrice(parseFloat(demoVehicle.pcdIpiIcms.toString()));
      setPcdIpiPrice(parseFloat(demoVehicle.pcdIpi.toString()));
      setTaxiIpiIcmsPrice(parseFloat(demoVehicle.taxiIpiIcms.toString()));
      setTaxiIpiPrice(parseFloat(demoVehicle.taxiIpi.toString()));
      
      // Inicializa o estado com uma lista vazia
      // As cores associadas serão definidas pelo useEffect que observa versionColors
      setAvailableColors([]);
    } else {
      setSelectedVehicle(null);
      setBasePrice(0);
      setPcdIpiIcmsPrice(0);
      setPcdIpiPrice(0);
      setTaxiIpiIcmsPrice(0);
      setTaxiIpiPrice(0);
      setAvailableColors([]);
    }
  };
  
  // Select a color
  const handleColorChange = (colorId: string) => {
    setSelectedColorId(colorId);
    
    if (colorId) {
      // Buscar o preço da relação versão-cor
      const versionColor = versionColors.find(vc => vc.colorId === parseInt(colorId));
      if (versionColor) {
        setColorPrice(parseFloat(versionColor.price));
      } else {
        setColorPrice(0);
      }
    } else {
      setColorPrice(0);
    }
  };
  
  // Handle discount percent change
  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercent(value);
    if (value && basePrice > 0) {
      const discountPercentValue = parseFloat(value);
      const newDiscountAmount = (basePrice * discountPercentValue / 100).toFixed(2);
      setDiscountAmount(newDiscountAmount);
    } else {
      setDiscountAmount("0");
    }
  };
  
  // Handle discount amount change
  const handleDiscountAmountChange = (value: string) => {
    setDiscountAmount(value);
    if (value && basePrice > 0) {
      const discountAmountValue = parseFloat(value);
      const newDiscountPercent = ((discountAmountValue / basePrice) * 100).toFixed(2);
      setDiscountPercent(newDiscountPercent);
    } else {
      setDiscountPercent("0");
    }
  };
  
  // Handle direct sale selection
  const handleDirectSaleChange = (directSaleId: string) => {
    setSelectedDirectSaleId(directSaleId);
    
    if (directSaleId && directSaleId !== "0") {
      // Find the selected direct sale
      const directSale = directSales.find(ds => ds.id.toString() === directSaleId);
      if (directSale) {
        // Como agora só mostramos descontos compatíveis com a marca, 
        // não precisamos verificar novamente se a marca corresponde
        handleDiscountPercentChange(directSale.discountPercentage.toString());
        console.log(`Aplicando desconto de ${directSale.name} (${directSale.discountPercentage}%)`);
      }
    } else {
      // Reset discount if no direct sale is selected
      handleDiscountPercentChange("0");
      console.log("Nenhum desconto de venda direta selecionado");
    }
  };
  
  // Update total price whenever relevant inputs change
  useEffect(() => {
    if (basePrice > 0) {
      const discountAmountValue = parseFloat(discountAmount) || 0;
      const markupAmountValue = parseFloat(markupAmount) || 0;
      const quantityValue = parseInt(quantity) || 1;
      
      // Adiciona o preço da cor e dos opcionais selecionados ao preço base
      const subtotal = basePrice + colorPrice + optionalsPrice;
      const withDiscount = subtotal - discountAmountValue;
      const withMarkup = withDiscount + markupAmountValue;
      const total = withMarkup * quantityValue;
      
      setTotalPrice(subtotal);
      setFinalPrice(total);
    } else {
      setTotalPrice(0);
      setFinalPrice(0);
    }
  }, [basePrice, colorPrice, optionalsPrice, discountAmount, markupAmount, quantity]);
  
  // Reset selected price type when vehicle changes
  useEffect(() => {
    setSelectedPriceType(null);
    setSelectedOptionals([]);
    setOptionalsPrice(0);
  }, [selectedVehicle]);
  
  // Handle optional selection
  const handleOptionalToggle = (optionalId: number, price: string) => {
    setSelectedOptionals(prev => {
      // Verificar se o opcional já está selecionado
      const isSelected = prev.includes(optionalId);
      
      if (isSelected) {
        // Se já estiver selecionado, remove
        setOptionalsPrice(prevPrice => prevPrice - parseFloat(price));
        return prev.filter(id => id !== optionalId);
      } else {
        // Se não estiver selecionado, adiciona
        setOptionalsPrice(prevPrice => prevPrice + parseFloat(price));
        return [...prev, optionalId];
      }
    });
  };
  
  // Handle price card selection
  const handlePriceCardClick = (priceType: string | null) => {
    // Se o mesmo cartão for clicado novamente, desmarque-o
    if (selectedPriceType === priceType) {
      setSelectedPriceType(null);
    } else {
      setSelectedPriceType(priceType);
    }
  };
  
  // Calcula o preço atual com base no tipo de preço selecionado
  const getCurrentBasePrice = () => {
    if (!selectedPriceType) return basePrice;
    
    switch (selectedPriceType) {
      case 'pcdIpi':
        return pcdIpiPrice;
      case 'taxiIpiIcms':
        return taxiIpiIcmsPrice;
      case 'pcdIpiIcms':
        return pcdIpiIcmsPrice;
      case 'taxiIpi':
        return taxiIpiPrice;
      default:
        return basePrice;
    }
  };
  
  // Calcula o preço final com base no tipo de preço selecionado
  const getCurrentFinalPrice = () => {
    if (!selectedPriceType) return finalPrice;
    
    const currentBase = getCurrentBasePrice();
    const discountAmountValue = parseFloat(discountAmount) || 0;
    const markupAmountValue = parseFloat(markupAmount) || 0;
    const quantityValue = parseInt(quantity) || 1;
    
    // Adiciona o preço da cor e dos opcionais selecionados
    const withAdditions = currentBase + colorPrice + optionalsPrice;
    // Subtrai o desconto
    const withDiscount = withAdditions - discountAmountValue;
    // Adiciona o ágio
    const withMarkup = withDiscount + markupAmountValue;
    // Multiplica pela quantidade
    return withMarkup * quantityValue;
  };
  
  // Get color card background style
  const getColorStyle = (hexCode: string) => {
    return {
      backgroundColor: hexCode,
      width: '100%',
      height: '60px',
      borderRadius: '4px',
      marginBottom: '8px'
    };
  };
  
  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader className="bg-primary text-white">
          <CardTitle className="text-xl">Configurador</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mb-6`}>
            <div>
              <Label htmlFor="brand-select">Marca</Label>
              <Select 
                value={selectedBrandId} 
                onValueChange={handleBrandChange}
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
            
            <div>
              <Label htmlFor="model-select">Modelo</Label>
              <Select 
                value={selectedModelId} 
                onValueChange={handleModelChange}
                disabled={!selectedBrandId}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModels.map(model => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="version-select">Versão</Label>
              <Select 
                value={selectedVersionId} 
                onValueChange={handleVersionChange}
                disabled={!selectedModelId}
              >
                <SelectTrigger id="version-select">
                  <SelectValue placeholder="Selecione uma versão" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVersions.map(version => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {version.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedVehicle && (
            <>
              <h3 className="text-xl font-bold mb-4">
                {selectedBrandId && brands.find(b => b.id === parseInt(selectedBrandId))?.name} {" "}
                {selectedModelId && filteredModels.find(m => m.id === parseInt(selectedModelId))?.name} {" "}
                {selectedVersionId && filteredVersions.find(v => v.id === parseInt(selectedVersionId))?.name} {" "}
                {selectedVehicle.fuelType?.toLowerCase() === 'gasoline' ? 'GASOLINA' : 
                  selectedVehicle.fuelType?.toUpperCase()} {selectedVehicle.year}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} gap-4 mb-6`}>
                    <Card 
                      className={`p-4 cursor-pointer ${selectedPriceType === null ? 'border-primary border-2' : ''}`}
                      onClick={() => handlePriceCardClick(null)}
                    >
                      <div className="text-xs mb-1">PREÇO PÚBLICO</div>
                      <div className="font-bold">{formatCurrency(basePrice)}</div>
                    </Card>
                    
                    {/* Card Zona Franca foi removido conforme solicitado */}
                    
                    <Card 
                      className={`p-4 bg-slate-100 cursor-pointer ${selectedPriceType === 'pcdIpi' ? 'border-primary border-2' : ''}`}
                      onClick={() => handlePriceCardClick('pcdIpi')}
                    >
                      <div className="text-xs mb-1">PCD IPI</div>
                      <div className="font-bold">{formatCurrency(pcdIpiPrice)}</div>
                    </Card>
                    
                    <Card 
                      className={`p-4 bg-slate-100 cursor-pointer ${selectedPriceType === 'taxiIpiIcms' ? 'border-primary border-2' : ''}`}
                      onClick={() => handlePriceCardClick('taxiIpiIcms')}
                    >
                      <div className="text-xs mb-1">TAXI IPI/ICMS</div>
                      <div className="font-bold">{formatCurrency(taxiIpiIcmsPrice)}</div>
                    </Card>
                    
                    <Card 
                      className={`p-4 bg-slate-100 cursor-pointer ${selectedPriceType === 'pcdIpiIcms' ? 'border-primary border-2' : ''}`}
                      onClick={() => handlePriceCardClick('pcdIpiIcms')}
                    >
                      <div className="text-xs mb-1">PCD IPI/ICMS</div>
                      <div className="font-bold">{formatCurrency(pcdIpiIcmsPrice)}</div>
                    </Card>
                    
                    <Card 
                      className={`p-4 bg-slate-100 cursor-pointer ${selectedPriceType === 'taxiIpi' ? 'border-primary border-2' : ''}`}
                      onClick={() => handlePriceCardClick('taxiIpi')}
                    >
                      <div className="text-xs mb-1">TAXI IPI</div>
                      <div className="font-bold">{formatCurrency(taxiIpiPrice)}</div>
                    </Card>
                  </div>
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} gap-4 mb-6`}>
                    <div>
                      <Label htmlFor="direct-sale-select">DESCONTOS VENDA DIRETA</Label>
                      <Select 
                        value={selectedDirectSaleId} 
                        onValueChange={handleDirectSaleChange}
                      >
                        <SelectTrigger id="direct-sale-select">
                          <SelectValue placeholder="Selecione um desconto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Nenhum</SelectItem>
                          {/* Filtrar para mostrar apenas os descontos específicos da marca selecionada */}
                          {directSales
                            .filter(sale => sale.brandId === parseInt(selectedBrandId) || sale.brandId === null)
                            .map(sale => (
                              <SelectItem 
                                key={sale.id} 
                                value={sale.id.toString()}
                              >
                                {sale.name} ({sale.discountPercentage}%)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="discount-percent">DESC.%</Label>
                      <div className="relative">
                        <Input 
                          id="discount-percent"
                          type="number" 
                          value={discountPercent}
                          onChange={(e) => handleDiscountPercentChange(e.target.value)}
                          className="pl-6" 
                        />
                        <span className="absolute left-2 top-2">%</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="discount-amount">DESC. R$</Label>
                      <div className="relative">
                        <Input 
                          id="discount-amount"
                          type="number" 
                          value={discountAmount}
                          onChange={(e) => handleDiscountAmountChange(e.target.value)}
                          className="pl-10" 
                        />
                        <span className="absolute left-3 top-2">R$</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="markup-amount">ÁGIO R$</Label>
                      <div className="relative">
                        <Input 
                          id="markup-amount"
                          type="number" 
                          value={markupAmount}
                          onChange={(e) => setMarkupAmount(e.target.value)}
                          className="pl-10" 
                        />
                        <span className="absolute left-3 top-2">R$</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="quantity">QT.</Label>
                      <Input 
                        id="quantity"
                        type="number" 
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Tabs defaultValue="equipamentos" value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
                    <TabsList className="w-full">
                      <TabsTrigger value="equipamentos" className="flex-1">Equipamentos</TabsTrigger>
                      <TabsTrigger value="diagrama" className="flex-1">Itens de Série</TabsTrigger>
                    </TabsList>
                    <TabsContent value="equipamentos" className="p-4 border rounded-md mt-2">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="opcionais">
                          <AccordionTrigger>
                            OPCIONAIS {selectedOptionals.length > 0 && `(${selectedOptionals.length} selecionados)`}
                          </AccordionTrigger>
                          <AccordionContent>
                            {versionOptionals && versionOptionals.length > 0 ? (
                              <div className="grid grid-cols-1 gap-3">
                                {versionOptionals.map(opt => (
                                  <div key={opt.id} className="p-3 border rounded-md flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <Checkbox 
                                        id={`optional-${opt.id}`} 
                                        checked={selectedOptionals.includes(opt.optionalId)}
                                        onCheckedChange={() => handleOptionalToggle(opt.optionalId, opt.price)}
                                      />
                                      <div>
                                        <label htmlFor={`optional-${opt.id}`} className="font-medium cursor-pointer">
                                          {opt.optional?.name}
                                        </label>
                                        <p className="text-sm text-gray-500">{opt.optional?.description}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold">{formatCurrency(parseFloat(opt.price))}</div>
                                      {opt.optional?.imageUrl && (
                                        <button className="text-xs text-blue-500 underline mt-1">
                                          Ver imagem
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2 text-center text-gray-500">
                                NÃO HÁ OPCIONAIS PARA ESSE MODELO!
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="diagrama" className="p-4 border rounded-md mt-2">
                      <div className="h-full">
                        {selectedVehicle && selectedVehicle.description ? (
                          <div className="prose">
                            <h3 className="text-lg font-semibold mb-3">Descrição e Itens de Série</h3>
                            <div className="whitespace-pre-wrap text-gray-700">
                              {selectedVehicle.description}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 flex justify-center items-center h-64">
                            Informações sobre itens de série não disponíveis
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-4">Pinturas</h4>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6`}>
                    {availableColors.map(color => (
                      <button 
                        key={color.id} 
                        className={`p-2 border rounded ${selectedColorId === color.id.toString() ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-gray-200'}`}
                        onClick={() => handleColorChange(color.id.toString())}
                      >
                        <div className="text-sm font-medium">{color.name}</div>
                        <div className="text-xs text-gray-500">{color.paintType?.name || 'Sem tipo'}</div>
                        <div className="text-sm">
                          {/* Usar preço da relação colorVersion em vez do additionalPrice da cor */}
                          {formatCurrency(parseFloat(versionColors.find(vc => vc.colorId === color.id)?.price || "0"))}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Exibir imagem da cor selecionada */}
                  {selectedColorId && (
                    <div className="mb-6">
                      {versionColors.find(vc => vc.colorId === parseInt(selectedColorId))?.imageUrl && (
                        <div className="flex justify-center items-center">
                          <img 
                            src={versionColors.find(vc => vc.colorId === parseInt(selectedColorId))?.imageUrl} 
                            alt="Imagem do veículo" 
                            className="max-h-48 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-auto">
                    <h4 className="text-lg font-semibold mb-4">Resumo e Valores Finais</h4>
                    <div className={`grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} gap-4 mb-4`}>
                      <Card className="p-4">
                        <div className="text-xs mb-1">Preço Base</div>
                        <div className="font-bold">{formatCurrency(getCurrentBasePrice())}</div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-xs mb-1">Pintura</div>
                        <div className="font-bold">{formatCurrency(colorPrice)}</div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-xs mb-1">Opcionais {selectedOptionals.length > 0 && `(${selectedOptionals.length})`}</div>
                        <div className="font-bold">{formatCurrency(optionalsPrice)}</div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-xs mb-1">Total</div>
                        <div className="font-bold">{formatCurrency(getCurrentBasePrice() + colorPrice + optionalsPrice)}</div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="text-xs mb-1">Desc. {discountPercent}%</div>
                        <div className="font-bold">{formatConfiguratorCurrency(parseFloat(discountAmount))}</div>
                      </Card>
                    </div>
                    
                    <Card className="p-4 bg-primary text-white">
                      <div className="text-sm mb-1">Preço Final x{quantity}</div>
                      <div className="text-xl font-bold">{formatCurrency(getCurrentFinalPrice())}</div>
                    </Card>
                    
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold mb-2">Outras Informações</h4>
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={4}
                        placeholder="Informações adicionais para serem inseridas nessa cotação"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Configurator;
