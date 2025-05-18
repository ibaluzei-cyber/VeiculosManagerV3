import { Link, useLocation } from "wouter";
import { Home, Car, Building, FileText, Palette, Settings, ListPlus, Menu, X, LogOut, User, Users, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { hasPermission, getPermissions, getCustomPermissions } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Componente para exibir o perfil do usuário logado
const UserProfile = () => {
  const { user, logoutMutation } = useAuth();
  const [filteredProfileItems, setFilteredProfileItems] = useState<Array<{path: string, label: string, icon: JSX.Element}>>([]);
  
  if (!user) return null;
  
  // Obter as iniciais do nome para o avatar
  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const userInitials = getInitials(user.name);

  // Define os itens do dropdown de perfil
  const profileMenuItems = [
    { 
      path: "/user/profile", 
      label: "Perfil", 
      icon: <User className="mr-2 h-4 w-4" /> 
    },
    { 
      path: "/user/profile?tab=password", 
      label: "Alterar Senha", 
      icon: <FileText className="mr-2 h-4 w-4" /> 
    },
    { 
      path: "/admin/permissions", 
      label: "Permissões de Acesso", 
      icon: <Shield className="mr-2 h-4 w-4" /> 
    }
  ];

  // Atualiza os itens do menu quando o usuário mudar
  useEffect(() => {
    if (user) {
      const filtered = profileMenuItems.filter(item => 
        hasPermission(item.path.split('?')[0], user?.role?.name)
      );
      setFilteredProfileItems(filtered);
    } else {
      setFilteredProfileItems([]);
    }
  }, [user]);
  
  return (
    <div className="mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center w-full justify-start p-2 hover:bg-gray-100 rounded-lg">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback className="bg-primary text-white">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium truncate max-w-[140px]">{user.name}</span>
              <span className="text-xs text-gray-500">{user.role?.name || "Usuário"}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Meus Dados</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {filteredProfileItems.map((item, index) => (
            <Link key={index} href={item.path}>
              <DropdownMenuItem className="cursor-pointer">
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            </Link>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
            {logoutMutation.isPending && (
              <span className="ml-2 animate-spin">⋯</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Define a estrutura do menu com path, label e ícone
const menuStructure = [
  { path: "/", label: "Dashboard", icon: <Home className="h-5 w-5 mr-2" /> },
  { path: "/vehicles", label: "Veículos", icon: <Car className="h-5 w-5 mr-2" /> },
  { path: "/brands", label: "Marcas", icon: <Building className="h-5 w-5 mr-2" /> },
  { path: "/models", label: "Modelos", icon: <FileText className="h-5 w-5 mr-2" /> },
  { path: "/versions", label: "Versões", icon: <FileText className="h-5 w-5 mr-2" /> },
  { path: "/colors", label: "Cores/Pinturas", icon: <Palette className="h-5 w-5 mr-2" /> },
  { path: "/paint-types", label: "Tipos de Pintura", icon: <Palette className="h-5 w-5 mr-2" /> },
  { path: "/optionals", label: "Opcionais", icon: <ListPlus className="h-5 w-5 mr-2" /> },
  { path: "/configurator", label: "Configurador", icon: <Car className="h-5 w-5 mr-2" /> },
  { path: "/configurator2", label: "Configurador Novo", icon: <Car className="h-5 w-5 mr-2" /> },
  { path: "/settings", label: "Configurações", icon: <Settings className="h-5 w-5 mr-2" /> },
  { path: "/admin/users", label: "Usuários", icon: <Users className="h-5 w-5 mr-2" /> },
  { path: "/admin/permissions", label: "Visualizar Permissões", icon: <Shield className="h-5 w-5 mr-2" /> },
  { path: "/admin/permission-settings", label: "Configurar Permissões", icon: <ShieldCheck className="h-5 w-5 mr-2" /> },
];

export default function Sidebar() {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [filteredMenuItems, setFilteredMenuItems] = useState<Array<{path: string, label: string, icon: JSX.Element}>>([]);
  
  // Carregar permissões e atualizar o menu quando o usuário mudar
  useEffect(() => {
    async function loadPermissions() {
      if (user) {
        try {
          // Garantir que as permissões foram carregadas
          await getPermissions();
          
          // Filtra os itens do menu para os quais o usuário tem permissão
          // Usando o sistema centralizado de permissões
          const filtered = menuStructure.filter(item => 
            hasPermission(item.path, user?.role?.name)
          );
          
          setFilteredMenuItems(filtered);
          setPermissionsLoaded(true);
        } catch (error) {
          console.error("Erro ao carregar permissões:", error);
          setPermissionsLoaded(true); // Marcar como carregado mesmo em caso de erro para não bloquear a interface
        }
      } else {
        setFilteredMenuItems([]);
        setPermissionsLoaded(true);
      }
    }
    
    setPermissionsLoaded(false);
    loadPermissions();
  }, [user]);
  
  const MenuItems = () => {
    if (!permissionsLoaded) {
      return (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }
    
    // Buscar configurações de cores do tema
  const { data: settings = [] } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn(),
    staleTime: 60 * 1000,
  });
  
  // Obter a cor do sidebar ativo
  const activeSidebarColor = settings.find((s: any) => s.key === "theme_color_active_sidebar")?.value || "#e6f6f5";
  const activeMenuColor = settings.find((s: any) => s.key === "theme_color_active_menu")?.value || "#0a9587";
  
  return (
      <ul className="space-y-1">
        {filteredMenuItems.map((item, index) => {
          const isActive = location.startsWith(item.path) || 
                (item.path !== '/' && location === item.path);
          
          return (
            <li key={index}>
              <Link 
                href={item.path} 
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={isActive ? { 
                  backgroundColor: activeSidebarColor,
                  borderLeftColor: activeMenuColor,
                  borderLeftWidth: '4px',
                  borderLeftStyle: 'solid'
                } : {}}
              >
                <span style={isActive ? { color: activeMenuColor } : {}}>
                  {item.icon}
                </span>
                <span style={isActive ? { color: activeMenuColor } : {}}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  if (isMobile) {
    return (
      <div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 fixed top-16 left-4 z-40 bg-white rounded-md shadow-md">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Administração</h2>
                <button onClick={() => setOpen(false)} className="p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Perfil do usuário */}
              {user && <UserProfile />}
              
              <nav>
                <MenuItems />
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-white shadow-md min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Administração</h2>
        
        {/* Perfil do usuário */}
        {user && <UserProfile />}
        
        <nav>
          <MenuItems />
        </nav>
      </div>
    </aside>
  );
}