import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

type Setting = {
  id: number;
  key: string;
  value: string;
  label: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

export function AppHead() {
  // Buscar configurações da aplicação com prioridade máxima
  const { data: settings = [] } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn(),
    staleTime: 60 * 1000, // 1 minuto antes de considerar os dados obsoletos
    refetchOnWindowFocus: true, // Recarregar quando a janela ganhar foco
  });

  useEffect(() => {
    if (settings.length === 0) return; // Não faz nada se as configurações não foram carregadas

    // Encontrar as configurações de nome da aplicação e favicon
    const appName = settings.find(s => s.key === "app_name")?.value;
    const appFavicon = settings.find(s => s.key === "app_favicon")?.value;
    const companyName = settings.find(s => s.key === "company_name")?.value;
    
    // Configurações de cores do tema
    const activeMenuColor = settings.find(s => s.key === "theme_color_active_menu")?.value || "#0a9587";
    const logoBarColor = settings.find(s => s.key === "theme_color_logo_bar")?.value || "#01a896";
    const activeSidebarColor = settings.find(s => s.key === "theme_color_active_sidebar")?.value || "#e6f6f5";

    // Atualizar o título da página de acordo com a ordem de prioridade
    if (appName && appName.trim() !== "") {
      document.title = appName;
      localStorage.setItem('app_name', appName);
    } else if (companyName && companyName.trim() !== "") {
      document.title = companyName;
      localStorage.setItem('app_name', companyName);
    }

    // Atualizar o favicon se estiver definido
    if (appFavicon && appFavicon.trim() !== "") {
      localStorage.setItem('app_favicon', appFavicon);
      
      try {
        // Procurar por links de favicon existentes
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
        
        // Remover favicons existentes
        existingFavicons.forEach(favicon => {
          favicon.remove();
        });

        // Criar um novo link para o favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/x-icon';
        link.href = appFavicon;
        
        // Adicionar o link ao <head>
        document.head.appendChild(link);
      } catch (error) {
        console.error("Erro ao atualizar o favicon:", error);
      }
    }
    
    // Aplicar as cores do tema dinamicamente
    applyThemeColors(activeMenuColor, logoBarColor, activeSidebarColor);
    
  }, [settings]);
  
  // Função para aplicar cores do tema dinamicamente
  const applyThemeColors = (activeMenuColor: string, logoBarColor: string, activeSidebarColor: string) => {
    try {
      // Verificar se o elemento de estilo de tema já existe
      let styleElement = document.getElementById('theme-custom-colors');
      
      // Se não existir, criar um novo elemento de estilo
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'theme-custom-colors';
        document.head.appendChild(styleElement);
      }
      
      // Definir as regras CSS para sobrescrever as cores do tema
      const cssRules = `
        /* Cor do menu ativo */
        .bg-primary, 
        .hover\\:bg-primary:hover,
        .active\\:bg-primary:active {
          --tw-bg-opacity: 1;
          background-color: ${activeMenuColor} !important;
        }
        
        .text-primary,
        .hover\\:text-primary:hover {
          --tw-text-opacity: 1;
          color: ${activeMenuColor} !important;
        }
        
        .border-primary {
          --tw-border-opacity: 1;
          border-color: ${activeMenuColor} !important;
        }
        
        .ring-primary {
          --tw-ring-opacity: 1;
          --tw-ring-color: ${activeMenuColor} !important;
        }
        
        .navlink.active,
        .nav-link.active {
          color: ${activeMenuColor} !important;
          --tw-bg-opacity: 1;
          background-color: transparent !important;
        }
        
        /* Sobrescrever a cor de fundo do nav-link.active */
        .nav-link.active {
          border-bottom: 3px solid ${activeMenuColor} !important;
        }
        
        /* Cor da barra abaixo do logo */
        .bg-primary-alt,
        .logo-bar {
          background-color: ${logoBarColor} !important;
        }
        
        /* Cor de fundo do item ativo na sidebar */
        .sidebar-item.active,
        .sidebar-item.active > div,
        .sidebar-bg-active {
          background-color: ${activeSidebarColor} !important;
        }
        
        /* Cor para elementos específicos */
        .sidebar-menu-item.active {
          background-color: ${activeSidebarColor} !important;
          border-left-color: ${activeMenuColor} !important;
        }
        
        /* Botões primários */
        .btn-primary, 
        .button-primary,
        .bg-primary {
          background-color: ${activeMenuColor} !important;
        }
        
        /* Elementos específicos com classe primária */
        h1, h2, h3 {
          color: inherit;
        }
      `;
      
      // Aplicar as regras CSS ao elemento de estilo
      styleElement.textContent = cssRules;
      
      // Salvar as cores no localStorage para persistência
      localStorage.setItem('theme_color_active_menu', activeMenuColor);
      localStorage.setItem('theme_color_logo_bar', logoBarColor);
      localStorage.setItem('theme_color_active_sidebar', activeSidebarColor);
      
      console.log('Cores do tema aplicadas com sucesso:', { 
        activeMenuColor, 
        logoBarColor, 
        activeSidebarColor 
      });
      
    } catch (error) {
      console.error('Erro ao aplicar cores do tema:', error);
    }
  };

  // Este componente não renderiza nada visível
  return null;
}