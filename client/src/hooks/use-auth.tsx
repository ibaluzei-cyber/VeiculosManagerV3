import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Tipo para o usuário com papel/função
type UserWithRole = {
  id: number;
  name: string;
  email: string;
  roleId: number;
  isActive: boolean;
  lastLogin?: string | Date | null;
  role?: {
    id: number;
    name: string;
    description?: string | null;
  };
};

// Contexto de autenticação
type AuthContextType = {
  user: UserWithRole | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithRole, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithRole, Error, RegisterData>;
};

// Dados para login
type LoginData = {
  email: string;
  password: string;
};

// Dados para registro
type RegisterData = {
  name: string;
  email: string;
  password: string;
  roleId: number;
};

// Criando o contexto
export const AuthContext = createContext<AuthContextType | null>(null);

// Função para processar respostas da API de forma segura
async function processApiResponse<T>(response: Response): Promise<T> {
  // Se a resposta não for bem-sucedida
  if (!response.ok) {
    const text = await response.text();
    let message = `Erro: ${response.status} ${response.statusText}`;
    
    // Tenta extrair mensagem de erro mais detalhada
    try {
      const errorData = JSON.parse(text);
      message = errorData.message || message;
    } catch {
      // Se não for um JSON válido, usar o texto como mensagem
      if (text) message = text;
    }
    
    throw new Error(message);
  }
  
  try {
    // Tenta extrair o JSON da resposta
    return await response.json() as T;
  } catch (e) {
    console.error("Falha ao processar resposta JSON:", e);
    throw new Error("Erro ao processar resposta do servidor");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Consulta para obter o usuário atual
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithRole | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        
        // Se não estiver autenticado, retornar null
        if (response.status === 401) {
          return null;
        }
        
        // Para outras respostas não OK, lançar erro
        if (!response.ok) {
          throw new Error(`Erro ao obter dados do usuário: ${response.statusText}`);
        }
        
        // Se tudo estiver OK, retornar os dados do usuário
        return await response.json();
      } catch (err) {
        console.error("Erro ao obter dados do usuário:", err);
        return null;
      }
    },
    retry: false,
  });

  // Mutação para login
  const loginMutation = useMutation<UserWithRole, Error, LoginData>({
    mutationFn: async (credentials) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return processApiResponse<UserWithRole>(response);
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${userData.name}!`,
      });
      
      // Redirecionamento inteligente baseado na página atual e tipo de usuário
      const currentPath = window.location.pathname;
      
      if (userData.role?.name === "Usuário") {
        // Se já está no configurator, não redireciona
        if (currentPath !== "/configurator2") {
          window.location.href = "/configurator2";
        }
      } else {
        // Para outros usuários, só redireciona se não estiver numa página válida
        if (currentPath === "/auth" || currentPath === "/landingpage" || currentPath === "/") {
          window.location.href = "/";
        }
        // Se estiver em uma página específica (como configurator), mantém onde está
      }
    },
    onError: (error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para registro
  const registerMutation = useMutation<UserWithRole, Error, RegisterData>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/register", data);
      return processApiResponse<UserWithRole>(response);
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo, ${userData.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para logout
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      console.log("Iniciando processo de logout no cliente");
      const response = await apiRequest("POST", "/api/logout");
      console.log(`Resposta do servidor para logout: ${response.status}`);
      
      if (!response.ok) {
        throw new Error("Falha ao realizar logout");
      }
      
      // Retorna os dados da resposta para log
      try {
        const data = await response.json();
        console.log("Dados da resposta de logout:", data);
      } catch (e) {
        console.log("Sem dados JSON na resposta de logout");
      }
      
      return;
    },
    onSuccess: () => {
      console.log("Logout bem-sucedido, limpando cache");
      
      // Limpa os dados do usuário na cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Limpa toda a cache para garantir que todos os dados protegidos sejam removidos
      queryClient.clear();
      
      // Mensagem de sucesso
      toast({
        title: "Logout realizado com sucesso",
        description: "Sua sessão foi encerrada com segurança"
      });
      
      // Forçar recarregamento da página para garantir limpeza total
      setTimeout(() => {
        window.location.href = "/auth";
      }, 100);
    },
    onError: (error) => {
      console.error("Erro durante o logout:", error);
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}