import { ReactNode, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const isMobile = useMobile();
  const { user } = useAuth();
  const isRegularUser = user?.role?.name === "Usuário";
  
  // Carregar configurações do tema IMEDIATAMENTE no layout
  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn(),
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Aplicar cores do tema IMEDIATAMENTE quando carregadas
  useEffect(() => {
    if (settings.length > 0) {
      const activeMenuColor = settings.find((s: any) => s.key === 'active_menu_color')?.value || '#3B82F6';
      const barBelowLogoColor = settings.find((s: any) => s.key === 'bar_below_logo_color')?.value || '#1E40AF';
      const activeSidebarBg = settings.find((s: any) => s.key === 'active_sidebar_bg_color')?.value || '#EFF6FF';
      
      // Aplicar cores CSS imediatamente
      document.documentElement.style.setProperty('--active-menu-color', activeMenuColor);
      document.documentElement.style.setProperty('--bar-below-logo-color', barBelowLogoColor);
      document.documentElement.style.setProperty('--active-sidebar-bg-color', activeSidebarBg);
    }
  }, [settings]);

  // Mostrar loading enquanto carrega configurações para evitar flash
  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--active-sidebar-bg-color)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{borderColor: 'var(--active-menu-color)'}}></div>
          <p style={{color: 'var(--active-menu-color)'}}>Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        {!isRegularUser && <Sidebar />}
        <main className={`flex-1 ${isMobile ? 'p-3' : 'p-6'} overflow-auto`}>
          {children}
        </main>
      </div>
    </div>
  );
}
