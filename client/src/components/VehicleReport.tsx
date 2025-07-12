import React from 'react';
import { formatCurrency } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';

interface VehicleReportProps {
  vehicleData: {
    brand: string;
    model: string;
    version: string;
    year: number;
    fuelType: string;
    selectedColor?: {
      name: string;
      price: number;
      imageUrl?: string;
    };
    selectedOptionals: Array<{
      name: string;
      price: number;
    }>;
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    markupAmount: number;
    finalPrice: number;
    quantity: number;
    vehicleDescription?: string;
    vehicleImage?: string;
  };
  onClose: () => void;
}

export default function VehicleReport({ vehicleData, onClose }: VehicleReportProps) {
  const { user } = useAuth();
  
  // Buscar configurações da empresa (logo)
  const { data: settings = [] } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: getQueryFn()
  });

  const companyLogo = settings.find((s: any) => s.key === 'company_logo')?.value || user?.logoUrl;
  const companyName = settings.find((s: any) => s.key === 'company_name')?.value || 'Empresa';

  // Separar itens de série em duas colunas
  const seriesItems = vehicleData.vehicleDescription?.split('\n').filter(item => item.trim()) || [];
  const midPoint = Math.ceil(seriesItems.length / 2);
  const leftColumn = seriesItems.slice(0, midPoint);
  const rightColumn = seriesItems.slice(midPoint);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Cabeçalho com botões - não imprime */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold">Relatório do Veículo</h2>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Imprimir
            </button>
            <button 
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo do relatório */}
        <div className="p-6 print:p-0">
          {/* Cabeçalho com logo da Cota Zero KM */}
          <div className="text-center mb-6">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Cota Zero KM"
                className="mx-auto mb-4 max-h-20 object-contain"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-800">Cota Zero KM</h1>
            )}
          </div>

          {/* Informações do veículo e imagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                {vehicleData.brand} {vehicleData.model} {vehicleData.version}
              </h2>
              <p className="text-gray-600 mb-2">
                Ano: {vehicleData.year} | Combustível: {vehicleData.fuelType.toUpperCase()}
              </p>
              {vehicleData.selectedColor && (
                <p className="text-gray-600 mb-2">
                  Cor: {vehicleData.selectedColor.name}
                </p>
              )}
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-700">PREÇO PÚBLICO</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(vehicleData.basePrice)}
                </p>
              </div>
            </div>
            
            {/* Imagem do veículo */}
            <div className="flex justify-center">
              {(() => {
                const imageUrl = vehicleData.vehicleImage || vehicleData.selectedColor?.imageUrl;
                
                return imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={`${vehicleData.brand} ${vehicleData.model}`}
                    className="max-w-full max-h-40 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-gray-500">Imagem não disponível</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Seção de opcionais e resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Opcionais selecionados */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Opcionais Selecionados</h3>
              {vehicleData.selectedOptionals.length > 0 ? (
                <div className="space-y-2">
                  {vehicleData.selectedOptionals.map((optional, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{optional.name}</span>
                      <span className="font-medium">{formatCurrency(optional.price)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nenhum opcional selecionado</p>
              )}
            </div>

            {/* Resumo financeiro */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Resumo Financeiro</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Preço base:</span>
                  <span>{formatCurrency(vehicleData.basePrice)}</span>
                </div>
                {vehicleData.selectedColor && vehicleData.selectedColor.price > 0 && (
                  <div className="flex justify-between">
                    <span>Cor ({vehicleData.selectedColor.name}):</span>
                    <span>{formatCurrency(vehicleData.selectedColor.price)}</span>
                  </div>
                )}
                {vehicleData.selectedOptionals.length > 0 && (
                  <div className="flex justify-between">
                    <span>Opcionais:</span>
                    <span>{formatCurrency(vehicleData.selectedOptionals.reduce((total, opt) => total + opt.price, 0))}</span>
                  </div>
                )}
                {vehicleData.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto ({vehicleData.discountPercent}%):</span>
                    <span>-{formatCurrency(vehicleData.discountAmount)}</span>
                  </div>
                )}
                {vehicleData.markupAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Acréscimo:</span>
                    <span>+{formatCurrency(vehicleData.markupAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total (x{vehicleData.quantity}):</span>
                    <span>{formatCurrency(vehicleData.finalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itens de série em duas colunas */}
          {vehicleData.vehicleDescription && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Itens de Série</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="text-sm space-y-1">
                    {leftColumn.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <ul className="text-sm space-y-1">
                    {rightColumn.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Dados do usuário */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Dados do Consultor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Nome:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
              </div>
              <div>
                {user?.phone && <p><strong>Telefone:</strong> {user.phone}</p>}
                {user?.address && <p><strong>Endereço:</strong> {user.address}</p>}
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Estilos CSS para impressão */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .fixed {
            position: static !important;
          }
          .bg-black {
            background-color: transparent !important;
          }
          .bg-opacity-50 {
            background-color: transparent !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
          }
          .max-h-\\[90vh\\] {
            max-height: none !important;
          }
          .overflow-auto {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}