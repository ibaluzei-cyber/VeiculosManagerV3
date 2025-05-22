import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function RedirectHandler() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Se ainda está carregando, não fazer nada
    if (isLoading) return;

    // Se não há usuário, redirecionar para landing page
    if (!user) {
      if (location !== "/landingpage" && location !== "/auth") {
        navigate("/landingpage", { replace: true });
      }
      return;
    }

    // Se usuário está logado, fazer redirecionamento baseado no papel
    if (user.role?.name === "Usuário") {
      // Usuários regulares vão direto para o configurador
      if (location === "/" || location === "/auth") {
        navigate("/configurator2", { replace: true });
      }
    } else {
      // Administradores e Cadastradores vão para o dashboard
      if (location === "/auth") {
        navigate("/", { replace: true });
      }
    }
  }, [user, isLoading, location, navigate]);

  // Mostrar carregamento durante redirecionamentos
  if (isLoading || 
      (!user && location !== "/landingpage" && location !== "/auth") ||
      (user?.role?.name === "Usuário" && (location === "/" || location === "/auth")) ||
      (user?.role?.name !== "Usuário" && location === "/auth")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return null;
}