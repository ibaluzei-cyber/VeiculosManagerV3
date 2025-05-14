import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { ArrowRight, Car, Shield, Settings, Users, Palette, BarChart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Definição das interfaces para os dados
interface Setting {
  key: string;
  value: string;
}

interface Vehicle {
  id: number;
  // outros campos...
}

interface Brand {
  id: number;
  name: string;
  // outros campos...
}

interface Model {
  id: number;
  name: string;
  // outros campos...
}

interface Version {
  id: number;
  name: string;
  // outros campos...
}

export default function LandingPage() {
  const isMobile = useMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [animatedCount, setAnimatedCount] = useState(0);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  
  // Buscar configurações da empresa
  const { data: settings = [] } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });
  
  // Buscar veículos, marcas, modelos para estatísticas
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });
  
  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });
  
  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ["/api/versions"],
  });
  
  // Verificar se o usuário está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Manipular o clique no botão "Começar agora"
  const handleStartNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isLoggedIn) {
      // Se o usuário estiver logado, redireciona para o dashboard
      setLocation("/");
    } else {
      // Se não estiver logado, abre o diálogo de alerta
      setIsAuthDialogOpen(true);
    }
  };
  
  // Extrair dados das configurações
  const companyName = settings.find(setting => setting.key === "company_name")?.value || "Auto+";
  const companyLogoUrl = settings.find(setting => setting.key === "company_logo_url")?.value;
  
  // Animação de contagem para estatísticas
  useEffect(() => {
    const targetCount = vehicles.length;
    if (targetCount > 0) {
      let count = 0;
      const interval = setInterval(() => {
        count += Math.ceil(targetCount / 20);
        if (count >= targetCount) {
          setAnimatedCount(targetCount);
          clearInterval(interval);
        } else {
          setAnimatedCount(count);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [vehicles]);
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt={companyName} className="h-10 w-auto" />
            ) : (
              <div className="text-primary font-bold text-2xl flex items-center">
                <Car className="h-8 w-8 mr-2" />
                {companyName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth">
              <Button>Registrar</Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Sistema de Gerenciamento de Veículos
            </h1>
            <p className="text-xl mb-8">
              Gerencie marcas, modelos, versões e configure veículos de forma intuitiva com nosso sistema completo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100"
                onClick={handleStartNowClick}
              >
                Começar agora <Car className="ml-2 h-5 w-5" />
              </Button>
              <a href="#features">
                <Button size="lg" className="bg-white/90 text-primary font-medium hover:bg-white">
                  Conheça os recursos <Settings className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
            
            {/* Modal customizada para usuários não autenticados */}
            {isAuthDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative overflow-hidden p-6">
                  <button 
                    onClick={() => setIsAuthDialogOpen(false)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary text-white hover:bg-primary-dark flex items-center justify-center border-2 border-white shadow-md"
                    aria-label="Fechar"
                  >
                    <span className="sr-only">Fechar</span>
                    <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </button>
                  
                  <div className="text-left">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Acesso Restrito
                    </h2>
                    <p className="text-gray-700 mb-6">
                      Para acessar o sistema de gerenciamento de veículos, você precisa estar registrado e autenticado.
                      Por favor, crie uma conta ou faça login para continuar.
                    </p>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Link href="/auth">
                      <Button className="w-full sm:w-auto">
                        Fazer Login / Registrar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="text-4xl font-bold text-primary mb-2">{animatedCount}+</h3>
                <p className="text-gray-600">Veículos Gerenciados</p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="text-4xl font-bold text-primary mb-2">{brands.length}+</h3>
                <p className="text-gray-600">Marcas Registradas</p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="text-4xl font-bold text-primary mb-2">{versions.length}+</h3>
                <p className="text-gray-600">Versões Disponíveis</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Recursos Poderosos</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma oferece todos os recursos necessários para uma gestão de veículos e preços para revendedores.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Gerenciamento de Veículos</h3>
                <p className="text-gray-600">
                  Gerencie marcas, modelos, versões de veículos de forma organizada e eficiente.
                </p>
              </CardContent>
            </Card>
            
            {/* Feature 2 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cores e Opcionais</h3>
                <p className="text-gray-600">
                  Sistema avançado de cores e tipos de pintura associados a versões específicas e itens opcionais.
                </p>
              </CardContent>
            </Card>
            
            {/* Feature 3 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Configurador de Preços</h3>
                <p className="text-gray-600">
                  Configure preços com simulação em tempo real, incluindo descontos e isenções fiscais (PCD, TAXI).
                </p>
              </CardContent>
            </Card>
            
            {/* Feature 4 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Equipamentos</h3>
                <p className="text-gray-600">
                  Gerencie equipamentos opcionais com preços específicos para cada versão de veículo, personalizando a oferta ao cliente.
                </p>
              </CardContent>
            </Card>
            
            {/* Feature 5 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Itens de Série</h3>
                <p className="text-gray-600">
                  Gerencie todos os itens de série inclusos em cada modelo, facilitando a comparação entre diferentes versões de veículos.
                </p>
              </CardContent>
            </Card>
            
            {/* Feature 6 */}
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Vendas Diretas</h3>
                <p className="text-gray-600">
                  Gerenciamento de descontos para vendas diretas específicas por marca.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Simplifique a gestão de veículos e configure o tipo de revenda para sua empresa com nossa plataforma completa.
          </p>
          <Link href="/auth">
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
              Criar uma conta / Login <Users className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-xl font-bold flex items-center">
                <Car className="h-6 w-6 mr-2" />
                {companyName}
              </div>
              <p className="mt-2 text-gray-400">Sistema de Gerenciamento de Veículos</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <Link href="/auth">
                <span className="text-gray-400 hover:text-white transition-colors">Login</span>
              </Link>
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Recursos
              </a>
              <Link href="/auth">
                <span className="text-gray-400 hover:text-white transition-colors">Registrar</span>
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} {companyName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}