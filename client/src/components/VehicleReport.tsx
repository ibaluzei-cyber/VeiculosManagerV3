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

  // Função para converter URL do PostImg para formato direto
  const convertPostImgUrl = (url: string): string => {
    if (!url) return url;
    
    // Se for URL do PostImg no formato https://postimg.cc/[id]
    const postImgMatch = url.match(/https:\/\/postimg\.cc\/([a-zA-Z0-9]+)/);
    if (postImgMatch) {
      // Infelizmente não conseguimos converter automaticamente sem saber o nome do arquivo
      // Vamos usar o fallback da configuração do sistema
      return settings.find((s: any) => s.key === 'company_logo_url')?.value || url;
    }
    
    return url;
  };

  const userLogo = user?.logoUrl ? convertPostImgUrl(user.logoUrl) : null;
  const systemLogo = settings.find((s: any) => s.key === 'company_logo_url')?.value;
  const companyLogo = userLogo || systemLogo;
  const companyName = settings.find((s: any) => s.key === 'company_name')?.value || 'Empresa';

  console.log('DEBUG - vehicleData completo:', vehicleData);
  console.log('DEBUG - selectedOptionals:', vehicleData.selectedOptionals);

  // Separar itens de série em duas colunas
  const seriesItems = vehicleData.vehicleDescription?.split('\n').filter(item => item.trim()) || [];
  const midPoint = Math.ceil(seriesItems.length / 2);
  const leftColumn = seriesItems.slice(0, midPoint);
  const rightColumn = seriesItems.slice(midPoint);

  const handlePrint = () => {
    // Criar uma nova janela para impressão apenas do conteúdo
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const modalContent = document.querySelector('.vehicle-report-modal');
      if (modalContent) {
        // Clonar o conteúdo e remover botões
        const contentClone = modalContent.cloneNode(true) as HTMLElement;
        const printHiddenElements = contentClone.querySelectorAll('.print\\:hidden');
        printHiddenElements.forEach(el => el.remove());
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Relatório do Veículo</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                line-height: 1.5;
                color: #374151;
                padding: 20px;
              }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .gap-3 { gap: 0.75rem; }
              .gap-4 { gap: 1rem; }
              .gap-6 { gap: 1.5rem; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .justify-center { justify-content: center; }
              .items-center { align-items: center; }
              .items-start { align-items: flex-start; }
              .text-center { text-align: center; }
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .font-medium { font-weight: 500; }
              .font-semibold { font-weight: 600; }
              .font-bold { font-weight: 700; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-6 { margin-bottom: 1.5rem; }
              .mt-4 { margin-top: 1rem; }
              .pt-3 { padding-top: 0.75rem; }
              .p-2 { padding: 0.5rem; }
              .p-6 { padding: 1.5rem; }
              .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
              .space-y-1 > * + * { margin-top: 0.25rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-blue-50 { background-color: #eff6ff; }
              .text-blue-700 { color: #1d4ed8; }
              .text-blue-900 { color: #1e3a8a; }
              .text-gray-500 { color: #6b7280; }
              .text-red-600 { color: #dc2626; }
              .text-green-600 { color: #16a34a; }
              .border { border: 1px solid #e5e7eb; }
              .border-t { border-top: 1px solid #e5e7eb; }
              .rounded { border-radius: 0.25rem; }
              .max-h-20 { max-height: 5rem; }
              .object-contain { object-fit: contain; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              
              /* Layout principal em 2 colunas para o relatório completo */
              .report-main-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-top: 1rem;
              }
              .report-left-column {
                display: flex;
                flex-direction: column;
              }
              .report-right-column {
                display: flex;
                flex-direction: column;
              }
              
              /* Layout específico para itens de série em 2 colunas dentro da coluna esquerda */
              .series-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                margin-top: 0.5rem;
              }
              .series-column {
                display: flex;
                flex-direction: column;
              }
              .series-column ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              .series-column li {
                padding: 0.125rem 0;
                font-size: 0.8rem;
                line-height: 1.3;
              }
              .series-column li:before {
                content: "• ";
                color: #6b7280;
                margin-right: 0.25rem;
              }
              
              @media print {
                body { margin: 0; padding: 10px; }
                @page { margin: 0.3in; size: A4; }
                
                /* CSS específico para impressão mobile */
                @media (max-width: 768px) {
                  body { padding: 5px; font-size: 10px; }
                  
                  /* Força layout 2 colunas mesmo em mobile */
                  .report-main-grid {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 0.5rem !important;
                  }
                  
                  .report-left-column,
                  .report-right-column {
                    width: 100% !important;
                  }
                  
                  /* Reduzir tamanhos de fonte */
                  h1 { font-size: 14px !important; margin-bottom: 6px !important; }
                  h2 { font-size: 12px !important; margin-bottom: 4px !important; }
                  h3 { font-size: 11px !important; margin-bottom: 3px !important; }
                  
                  .text-xl { font-size: 12px !important; }
                  .text-lg { font-size: 11px !important; }
                  .text-sm { font-size: 9px !important; }
                  
                  /* Compactar espaçamentos */
                  .mb-3 { margin-bottom: 4px !important; }
                  .mb-4 { margin-bottom: 6px !important; }
                  .mb-6 { margin-bottom: 8px !important; }
                  .mt-4 { margin-top: 6px !important; }
                  .p-6 { padding: 8px !important; }
                  .p-2 { padding: 3px !important; }
                  
                  /* Grid de séries otimizado */
                  .series-grid {
                    gap: 0.25rem !important;
                  }
                  
                  .series-column li {
                    font-size: 10px !important;
                    line-height: 1.2 !important;
                    padding: 0 !important;
                    margin-bottom: 2px !important;
                  }
                  
                  /* Imagem menor */
                  img {
                    max-height: 60px !important;
                  }
                  
                  /* Background boxes compactos */
                  .bg-gray-50,
                  .bg-blue-50 {
                    padding: 3px !important;
                  }
                }
              }
            </style>
          </head>
          <body>
            ${contentClone.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Detectar se é mobile e ajustar layout
        const script = printWindow.document.createElement('script');
        script.textContent = `
          function isMobile() {
            return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          }
          
          if (isMobile()) {
            document.body.classList.add('mobile-print');
            // Adicionar CSS específico para mobile
            const mobileStyle = document.createElement('style');
            mobileStyle.textContent = \`
              @media print {
                .mobile-print * { font-size: 10px !important; }
                .mobile-print h1 { font-size: 14px !important; }
                .mobile-print h2 { font-size: 12px !important; }
                .mobile-print h3 { font-size: 11px !important; }
                .mobile-print .report-main-grid { 
                  display: grid !important; 
                  grid-template-columns: 1fr 1fr !important; 
                  gap: 0.5rem !important; 
                }
                .mobile-print .mb-3 { margin-bottom: 4px !important; }
                .mobile-print .mb-4 { margin-bottom: 6px !important; }
                .mobile-print .mb-6 { margin-bottom: 8px !important; }
                .mobile-print .p-6 { padding: 8px !important; }
                .mobile-print .p-2 { padding: 3px !important; }
                .mobile-print img { max-height: 60px !important; }
                .mobile-print .bg-gray-50 { padding: 3px !important; }
                .mobile-print .series-column li { font-size: 10px !important; line-height: 1.2 !important; }
              }
            \`;
            document.head.appendChild(mobileStyle);
          }
        `;
        printWindow.document.head.appendChild(script);
        
        // Aguardar carregamento e imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          }, 800);
        };
      }
    } else {
      // Fallback para impressão normal se popup for bloqueado
      document.body.classList.add('printing');
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing');
        }, 1000);
      }, 100);
    }
  };

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:static print:bg-transparent print:p-0">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible print:rounded-none vehicle-report-modal">
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
          <div className="p-6 print:p-4">
          {/* Cabeçalho com logo da Cota Zero KM */}
          <div className="text-center mb-6">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Cota Zero KM"
                className="mx-auto mb-4 max-h-20 object-contain"
                onError={(e) => {
                  console.error('Erro ao carregar logo:', companyLogo);
                  e.currentTarget.style.display = 'none';
                  // Mostrar texto como fallback
                  const fallbackDiv = document.createElement('h1');
                  fallbackDiv.className = 'text-2xl font-bold text-gray-800';
                  fallbackDiv.textContent = 'Cota Zero KM';
                  e.currentTarget.parentNode?.appendChild(fallbackDiv);
                }}
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-800">Cota Zero KM</h1>
            )}
          </div>

          {/* Layout principal em 2 colunas */}
          <div className="report-main-grid">
            {/* Coluna esquerda: Informações principais */}
            <div className="report-left-column">
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
              <div className="bg-blue-50 p-3 rounded mb-4">
                <p className="text-sm text-blue-700">PREÇO PÚBLICO</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(vehicleData.basePrice)}
                </p>
              </div>

              {/* Opcionais selecionados */}
              {vehicleData.selectedOptionals.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-md font-medium mb-2">Opcionais Selecionados</h3>
                  <div className="space-y-1">
                    {vehicleData.selectedOptionals.map((optional, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{optional.name}</span>
                        <span className="font-medium">{formatCurrency(optional.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
            
            {/* Coluna direita: Imagem e resumo financeiro */}
            <div className="report-right-column">
              {/* Imagem do veículo */}
              <div className="flex justify-center mb-4">
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

              {/* Resumo financeiro */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="text-md font-medium mb-3">Resumo Financeiro</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Preço base:</span>
                    <span className="font-medium">{formatCurrency(vehicleData.basePrice)}</span>
                  </div>
                  
                  {vehicleData.selectedColor && vehicleData.selectedColor.price > 0 && (
                    <div className="flex justify-between">
                      <span>Cor ({vehicleData.selectedColor.name}):</span>
                      <span className="font-medium">{formatCurrency(vehicleData.selectedColor.price)}</span>
                    </div>
                  )}
                  
                  {vehicleData.selectedOptionals.length > 0 && (
                    <div className="flex justify-between">
                      <span>Opcionais:</span>
                      <span className="font-medium">
                        {formatCurrency(vehicleData.selectedOptionals.reduce((sum, opt) => sum + opt.price, 0))}
                      </span>
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
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total (x{vehicleData.quantity}):</span>
                      <span>{formatCurrency(vehicleData.finalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itens de série em seção separada ocupando toda a largura */}
          {seriesItems.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-medium mb-3">Itens de Série</h3>
              <div className="series-grid">
                <div className="series-column">
                  <ul>
                    {leftColumn.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="series-column">
                  <ul>
                    {rightColumn.map((item, index) => (
                      <li key={index}>{item}</li>
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
          <div className="text-center mt-4 pt-3 border-t">
            <p className="text-sm text-gray-500">
              Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}