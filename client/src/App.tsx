import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Importar todas as páginas necessárias
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import Dashboard from "@/pages/dashboard/Dashboard";
import NotFound from "@/pages/not-found";
import Configurator from "@/pages/configurator";
import Configurator2 from "@/pages/configurator2";

// Páginas de marcas
import BrandList from "@/pages/brands/BrandList";
import BrandForm from "@/pages/brands/BrandForm";

// Páginas de modelos
import ModelList from "@/pages/models/ModelList";
import ModelForm from "@/pages/models/ModelForm";

// Páginas de versões
import VersionList from "@/pages/versions/VersionList";
import VersionForm from "@/pages/versions/VersionForm";

// Páginas de cores
import ColorList from "@/pages/colors/ColorList";
import ColorForm from "@/pages/colors/ColorForm";
import ColorTabs from "@/pages/colors/ColorTabs";
import VersionColorList from "@/pages/colors/VersionColorList";
import VersionColorForm from "@/pages/colors/VersionColorForm";

// Páginas de tipos de pintura
import PaintTypeList from "@/pages/paint-types/PaintTypeList";
import PaintTypeForm from "@/pages/paint-types/PaintTypeForm";

// Páginas de opcionais
import OptionalList from "@/pages/optionals/OptionalList";
import OptionalForm from "@/pages/optionals/OptionalForm";
import OptionalTabs from "@/pages/optionals/OptionalTabs";
import VersionOptionalList from "@/pages/optionals/VersionOptionalList";
import VersionOptionalForm from "@/pages/optionals/VersionOptionalForm";

// Páginas de veículos
import VehicleList from "@/pages/vehicles/VehicleList";
import VehicleForm from "@/pages/vehicles/VehicleForm";
import VehicleFormFixed from "@/pages/vehicles/VehicleFormFixed";

// Páginas de vendas diretas
import DirectSaleList from "@/pages/direct-sales/DirectSaleList";
import DirectSaleForm from "@/pages/direct-sales/DirectSaleForm";

// Páginas de usuário
import UserProfile from "@/pages/user/profile";

// Páginas de configurações
import Settings from "@/pages/settings/Settings";
import CompanySettingsPage from "@/pages/settings/CompanySettingsPage";

// Páginas administrativas
import UserManagement from "@/pages/admin/UserManagement";
import AccessPermissions from "@/pages/admin/AccessPermissions";
import PermissionSettings from "@/pages/admin/PermissionSettings";

// Layout componente
import AdminLayout from "@/components/layout/AdminLayout";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Se não há usuário logado, mostrar apenas rotas públicas
  if (!user) {
    return (
      <Switch>
        <Route path="/landingpage" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={LandingPage} />
        <Route component={() => <LandingPage />} />
      </Switch>
    );
  }

  // Usuário logado - redirecionar diretamente baseado no papel
  const isRegularUser = user?.role?.name === "Usuário";
  
  return (
    <AdminLayout>
      <Switch>
        {/* Rotas protegidas principais */}
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/configurator" component={Configurator} />
        <ProtectedRoute path="/configurator2" component={Configurator2} />
        
        {/* Rotas de marcas */}
        <ProtectedRoute path="/brands" component={BrandList} />
        <ProtectedRoute path="/brands/new" component={BrandForm} />
        <ProtectedRoute path="/brands/:id/edit" component={BrandForm} />
        
        {/* Rotas de modelos */}
        <ProtectedRoute path="/models" component={ModelList} />
        <ProtectedRoute path="/models/new" component={ModelForm} />
        <ProtectedRoute path="/models/:id/edit" component={ModelForm} />
        
        {/* Rotas de versões */}
        <ProtectedRoute path="/versions" component={VersionList} />
        <ProtectedRoute path="/versions/new" component={VersionForm} />
        <ProtectedRoute path="/versions/:id/edit" component={VersionForm} />
        
        {/* Rotas de cores */}
        <ProtectedRoute path="/colors" component={ColorTabs} />
        <ProtectedRoute path="/colors/list" component={ColorList} />
        <ProtectedRoute path="/colors/new" component={ColorForm} />
        <ProtectedRoute path="/colors/:id/edit" component={ColorForm} />
        <ProtectedRoute path="/colors/version-colors" component={VersionColorList} />
        <ProtectedRoute path="/colors/version-colors/new" component={VersionColorForm} />
        <ProtectedRoute path="/colors/version-colors/:id/edit" component={VersionColorForm} />
        
        {/* Rotas de tipos de pintura */}
        <ProtectedRoute path="/paint-types" component={PaintTypeList} />
        <ProtectedRoute path="/paint-types/new" component={PaintTypeForm} />
        <ProtectedRoute path="/paint-types/:id/edit" component={PaintTypeForm} />
        
        {/* Rotas de opcionais */}
        <ProtectedRoute path="/optionals" component={OptionalTabs} />
        <ProtectedRoute path="/optionals/list" component={OptionalList} />
        <ProtectedRoute path="/optionals/new" component={OptionalForm} />
        <ProtectedRoute path="/optionals/:id/edit" component={OptionalForm} />
        <ProtectedRoute path="/optionals/version-optionals" component={VersionOptionalList} />
        <ProtectedRoute path="/optionals/version-optionals/new" component={VersionOptionalForm} />
        <ProtectedRoute path="/optionals/version-optionals/:id/edit" component={VersionOptionalForm} />
        
        {/* Rotas de veículos */}
        <ProtectedRoute path="/vehicles" component={VehicleList} />
        <ProtectedRoute path="/vehicles/new" component={VehicleForm} />
        <ProtectedRoute path="/vehicles/:id/edit" component={VehicleFormFixed} />
        
        {/* Rotas de vendas diretas */}
        <ProtectedRoute path="/direct-sales" component={DirectSaleList} />
        <ProtectedRoute path="/direct-sales/new" component={DirectSaleForm} />
        <ProtectedRoute path="/direct-sales/edit/:id" component={DirectSaleForm} />
        
        {/* Rotas de usuário */}
        <ProtectedRoute path="/user/profile" component={UserProfile} />
        
        {/* Rotas de configurações */}
        <ProtectedRoute path="/settings" component={Settings} />
        <ProtectedRoute path="/settings/company" component={CompanySettingsPage} />
        
        {/* Rotas administrativas */}
        <ProtectedRoute path="/admin/users" component={UserManagement} />
        <ProtectedRoute path="/admin/permissions" component={AccessPermissions} />
        <ProtectedRoute path="/admin/permission-settings" component={PermissionSettings} />
        
        {/* Fallback para usuários logados - vai para dashboard */}
        <Route component={Dashboard} />
      </Switch>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}