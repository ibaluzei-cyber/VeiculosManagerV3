import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Importar páginas essenciais
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import Dashboard from "@/pages/dashboard/Dashboard";
import Configurator2 from "@/pages/configurator2";

// Layout componente
import AdminLayout from "@/components/layout/AdminLayout";

function Router() {
  return (
    <Switch>
      {/* Rotas públicas */}
      <Route path="/landingpage" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Rotas protegidas essenciais */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/configurator2" component={Configurator2} />
    </Switch>
  );
}

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
      </Switch>
    );
  }

  // Usuário logado - usar layout administrativo com sidebar
  return (
    <AdminLayout>
      <Router />
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