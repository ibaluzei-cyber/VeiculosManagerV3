import { Link, useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Header() {
  const [location] = useLocation();
  const isMobile = useMobile();
  const { user, logoutMutation } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { toast } = useToast();
  
  // Buscar todas as configurações
  const { data: settings = [] } = useQuery<Array<{key: string, value: string}>>({
    queryKey: ["/api/settings"],
  });
  
  // Encontrar configurações da empresa
  const companyName = settings.find(setting => setting.key === "company_name")?.value || "Auto+";
  const companyLogoUrl = settings.find(setting => setting.key === "company_logo_url")?.value;
  
  // Estrutura de menu dinâmica baseada em permissões
  const menuItems = [
    { path: "/", label: "INÍCIO", permission: "Dashboard" },
    { path: "/vehicles", label: "VEÍCULOS", permission: "Visualizar veículos" },
    { path: "/configurator", label: "CONFIGURADOR", permission: "Configurador de veículos" },
    { path: "/brands", label: "MARCAS", permission: "Visualizar marcas" },
    { path: "/models", label: "MODELOS", permission: "Visualizar modelos" },
    { path: "/versions", label: "VERSÕES", permission: "Visualizar versões" }
  ];
  
  // Filtrar os itens do menu com base nas permissões do usuário
  const [filteredMenuItems, setFilteredMenuItems] = useState<Array<{path: string, label: string}>>([]);
  
  // Atualizar os menus quando o usuário mudar
  useEffect(() => {
    if (user) {
      const filtered = menuItems.filter(item => 
        hasPermission(item.path, user?.role?.name)
      );
      setFilteredMenuItems(filtered);
    } else {
      setFilteredMenuItems([]);
    }
  }, [user]);
  
  // Função para abrir o diálogo de confirmação de logout
  const showLogoutConfirmation = () => {
    setShowLogoutDialog(true);
  };
  
  // Função para realizar logout efetivamente
  const handleLogout = () => {
    // Registra a tentativa no console para debug
    console.log("Iniciando o processo de logout no componente Header");
    
    // Adiciona uma mensagem de feedback para o usuário
    toast({
      title: "Encerrando sessão...",
      description: "Sua sessão está sendo encerrada com segurança",
    });
    
    // Executa a mutação de logout
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-white shadow">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <div className="flex items-center">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt="Logo" className="h-8 w-auto" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            )}
            <span className="ml-2 text-xl font-semibold text-primary">
              {isMobile ? companyName.substring(0, 12) + (companyName.length > 12 ? '...' : '') : companyName}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {!isMobile && user && (
            <span className="text-sm text-gray-600">
              Olá {user.name} ({user.id}), 
              {user.lastLogin 
                ? ` seu último acesso foi em ${new Date(user.lastLogin).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}h` 
                : " bem-vindo ao sistema"
              }
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-800">
              <span>{isMobile ? "Conta" : "Meus dados"}</span>
              <ChevronDown className="ml-1 h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href="/user/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/user/profile?tab=password">
                <DropdownMenuItem className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Alterar senha</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={showLogoutConfirmation}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
                {logoutMutation.isPending && (
                  <span className="ml-2 animate-spin">⋯</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <nav className="bg-primary logo-bar">
        <div className="max-w-full mx-auto px-4">
          {!isMobile && (
            <div className="flex">
              <div className="flex space-x-1">
                {/* Renderizar apenas os links que o usuário tem permissão */}
                {filteredMenuItems.map((item, index) => {
                  const isActive = location.startsWith(item.path) || 
                      (item.path !== '/' && location === item.path);
                  
                  // Buscar configuração da cor do menu ativo
                  const activeMenuColor = settings.find((s: any) => s.key === "theme_color_active_menu")?.value || "#0a9587";
                  
                  return (
                    <Link 
                      key={index} 
                      href={item.path} 
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      style={isActive ? { color: "#fff" } : {}}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Diálogo de confirmação de logout */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair do sistema? Sua sessão será encerrada completamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {logoutMutation.isPending ? (
                <>
                  <span className="mr-2">Encerrando...</span>
                  <span className="animate-spin">⋯</span>
                </>
              ) : "Sair do Sistema"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
