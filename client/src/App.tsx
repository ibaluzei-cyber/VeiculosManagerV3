import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AdminLayout from "@/components/layout/AdminLayout";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AppHead } from "@/components/AppHead";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { setCustomPermissions } from "@/lib/permissions";

// Pages
import Dashboard from "@/pages/dashboard/Dashboard";
import BrandList from "@/pages/brands/BrandList";
import BrandForm from "@/pages/brands/BrandForm";
import ModelList from "@/pages/models/ModelList";
import ModelForm from "@/pages/models/ModelForm";
import VersionList from "@/pages/versions/VersionList";
import VersionForm from "@/pages/versions/VersionForm";
import ColorTabs from "@/pages/colors/ColorTabs";
import ColorList from "@/pages/colors/ColorList";
import ColorForm from "@/pages/colors/ColorForm";
import VehicleList from "@/pages/vehicles/VehicleList";
import VehicleForm from "@/pages/vehicles/VehicleFormFixed";
import PaintTypeList from "@/pages/paint-types/PaintTypeList";
import PaintTypeForm from "@/pages/paint-types/PaintTypeForm";
import OptionalTabs from "@/pages/optionals/OptionalTabs";
import OptionalForm from "@/pages/optionals/OptionalForm";
import DirectSaleForm from "./pages/direct-sales/DirectSaleForm";
import Configurator from "@/pages/configurator";
import Configurator2 from "@/pages/configurator2";
import Settings from "@/pages/settings/Settings";
import ProfilePage from "@/pages/user/profile";
import UserManagement from "@/pages/admin/UserManagement";
import AccessPermissions from "@/pages/admin/AccessPermissions";
import PermissionSettings from "@/pages/admin/PermissionSettings";
import LandingPage from "@/pages/landing-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

function Router() {
  return (
    <Switch>
      {/* Rota de autenticação - acessível a todos */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Rotas protegidas - só podem ser acessadas por usuários autenticados */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Lista de marcas e configurador - acessível por todos os usuários autenticados */}
      <ProtectedRoute path="/brands" component={BrandList} />
      <ProtectedRoute path="/configurator" component={Configurator} />
      <ProtectedRoute path="/configurator2" component={Configurator2} requiredRole="Administrador" />
      
      {/* Funcionalidades de cadastro - requer papel de Cadastrador ou Admin */}
      <ProtectedRoute path="/brands/new" component={BrandForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/brands/:id/edit" component={BrandForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/models" component={ModelList} />
      <ProtectedRoute path="/models/new" component={ModelForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/models/:id/edit" component={ModelForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/versions" component={VersionList} />
      <ProtectedRoute path="/versions/new" component={VersionForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/versions/:id/edit" component={VersionForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/colors" component={ColorTabs} />
      <ProtectedRoute path="/paint-types" component={PaintTypeList} />
      <ProtectedRoute path="/paint-types/new" component={PaintTypeForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/paint-types/:id/edit" component={PaintTypeForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/optionals" component={OptionalTabs} />
      <ProtectedRoute path="/optionals/new" component={OptionalForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/optionals/:id/edit" component={OptionalForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/vehicles" component={VehicleList} />
      <ProtectedRoute path="/vehicles/new" component={VehicleForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/vehicles/:id/edit" component={VehicleForm} requiredRole="Cadastrador" />
      
      {/* Direct sales routes */}
      <ProtectedRoute path="/direct-sales/new" component={DirectSaleForm} requiredRole="Cadastrador" />
      <ProtectedRoute path="/direct-sales/edit/:id" component={DirectSaleForm} requiredRole="Cadastrador" />
      
      {/* Configurações - acessível apenas para Administradores */}
      <ProtectedRoute path="/settings" component={Settings} requiredRole="Administrador" />
      
      {/* Gerenciamento de usuários - acessível apenas para Administradores */}
      <ProtectedRoute path="/admin/users" component={UserManagement} requiredRole="Administrador" />
      <ProtectedRoute path="/admin/permissions" component={AccessPermissions} />
      <ProtectedRoute path="/admin/permission-settings" component={PermissionSettings} requiredRole="Administrador" />

      {/* Perfil de usuário - acessível por todos os usuários autenticados */}
      <ProtectedRoute path="/user/profile" component={ProfilePage} />
      
      {/* Rota para página não encontrada */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente para envolver as rotas protegidas no layout de administração
function ProtectedContent() {
  const { user } = useAuth();
  
  // Carregar as permissões personalizadas
  const { data: customPermissions } = useQuery({
    queryKey: ['/api/permissions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/permissions');
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        return {};
      }
    },
    // Só carregar se o usuário estiver autenticado
    enabled: !!user,
    // Não precisa recarregar com frequência
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Prefetch de dados essenciais para todas as páginas quando o usuário está autenticado
  useEffect(() => {
    if (user) {
      console.log("Prefetching essential data for all pages...");
      
      // Dados essenciais que serão carregados uma vez que o usuário estiver autenticado
      const essentialQueries = [
        '/api/versions',   // Versões para o menu de versões
        '/api/brands',     // Marcas para vários componentes
        '/api/models',     // Modelos para vários componentes
        '/api/colors'      // Cores para o configurador
      ];
      
      // Prefetch de todos os dados essenciais
      essentialQueries.forEach(query => {
        console.log(`Pre-loading data for: ${query}`);
        queryClient.prefetchQuery({
          queryKey: [query],
          queryFn: async () => {
            try {
              const response = await fetch(query);
              console.log(`Prefetch response for ${query}: ${response.status}`);
              if (!response.ok) {
                throw new Error(`Error prefetching ${query}: ${response.statusText}`);
              }
              return response.json();
            } catch (error) {
              console.error(`Error during prefetch for ${query}:`, error);
              throw error;
            }
          }
        });
      });
    }
  }, [user]);
  
  // Configurar as permissões personalizadas quando carregadas
  useEffect(() => {
    if (customPermissions) {
      setCustomPermissions(customPermissions);
    }
  }, [customPermissions]);
  
  return (
    <AdminLayout>
      <Router />
    </AdminLayout>
  );
}

// Componente de redirecionamento simples
function RedirectTo({ to }: { to: string }) {
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  
  return null;
}

// Componente de roteamento externo que não requer autenticação
function PublicRouter() {
  return (
    <Switch>
      <Route path="/landingpage">
        <LandingPage />
      </Route>
      <Route path="/">
        <RedirectTo to="/landingpage" />
      </Route>
    </Switch>
  );
}

function AppWithRouter() {
  // Utilize o hook useLocation para verificar a rota atual
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  
  const isLandingPage = location === '/landingpage' || 
                        (!user && !isLoading && location === '/');

  return (
    <>
      {/* Componente para gerenciar o título e favicon da aplicação */}
      <AppHead />
      
      {/* Renderiza a landing page fora do layout admin quando a rota for /landingpage 
         ou quando o usuário não estiver autenticado e estiver na rota inicial */}
      {isLandingPage ? (
        <>
          <PublicRouter />
          <Toaster />
        </>
      ) : (
        <>
          <ProtectedContent />
          <Toaster />
        </>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <AppWithRouter />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
