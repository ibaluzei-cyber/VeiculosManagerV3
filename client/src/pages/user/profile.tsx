import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { X } from "lucide-react";
import InputMask from "react-input-mask";

// Schema para validação do formulário de perfil
const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  cnpj: z.string().optional(),
  logoUrl: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "URL da logo inválida"
  }),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Schema para validação do formulário de alteração de senha
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme sua senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  // Obter parâmetro de query string para a aba ativa
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(
    tabParam === 'password' ? 'password' : 'profile'
  );

  // Form para o perfil
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      cnpj: (user as any)?.cnpj || "",
      logoUrl: (user as any)?.logoUrl || "",
      address: (user as any)?.address || "",
      phone: (user as any)?.phone || "",
    },
  });

  // Form para alteração de senha
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Atualizar valores do formulário quando os dados do usuário mudarem
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        email: user.email || "",
        cnpj: (user as any)?.cnpj || "",
        logoUrl: (user as any)?.logoUrl || "",
        address: (user as any)?.address || "",
        phone: (user as any)?.phone || "",
      });
    }
  }, [user, profileForm]);

  // Função para atualizar o perfil
  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setUpdating(true);
    try {
      const response = await apiRequest("PUT", `/api/users/${user.id}`, data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar perfil");
      }

      const updatedUser = await response.json();
      
      // Invalidar cache do usuário para forçar recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Atualizar os valores padrão do formulário com os dados atualizados
      profileForm.reset({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        cnpj: updatedUser.cnpj || "",
        logoUrl: updatedUser.logoUrl || "",
        address: updatedUser.address || "",
        phone: updatedUser.phone || "",
      });
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o perfil",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Função para alterar a senha
  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user) return;
    
    console.log("Iniciando alteração de senha para usuário ID:", user.id);
    console.log("Dados do formulário:", { 
      currentPassword: data.currentPassword ? "***" : undefined, 
      newPassword: data.newPassword ? "***" : undefined,
      confirmPassword: data.confirmPassword ? "***" : undefined
    });
    
    setChangingPassword(true);
    try {
      // Validar dados antes de enviar
      if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
        throw new Error("Todos os campos são obrigatórios");
      }
      
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }
      
      // Enviar requisição
      console.log(`Enviando requisição para /api/users/${user.id}/password`);
      const response = await apiRequest("PUT", `/api/users/${user.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      // Analisar resposta
      console.log(`Resposta recebida com status ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro na resposta:", errorData);
        throw new Error(errorData.message || "Erro ao alterar senha");
      }
      
      // Resetar formulário em caso de sucesso
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Mensagem de sucesso
      console.log("Senha alterada com sucesso!");
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso!",
      });
    } catch (error) {
      console.error("Erro durante alteração de senha:", error);
      toast({
        title: "Erro ao alterar senha",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao alterar a senha",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Você precisa estar logado para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Meus Dados</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Menu lateral */}
        <div className="space-y-2">
          <Link href="/user/profile">
            <Button 
              variant={activeTab === 'profile' ? "default" : "outline"} 
              className="w-full justify-start"
            >
              Perfil
            </Button>
          </Link>
          <Link href="/user/profile?tab=password">
            <Button 
              variant={activeTab === 'password' ? "default" : "outline"} 
              className="w-full justify-start"
            >
              Alterar Senha
            </Button>
          </Link>
        </div>
        
        {/* Conteúdo */}
        <div className="md:col-span-2">
          {activeTab === 'profile' ? (
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="99.999.999/9999-99"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps}
                                  placeholder="00.000.000/0000-00"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo (URL)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://exemplo.com/logo.png" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número, bairro, cidade - UF" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="(99) 99999-9999"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                            >
                              {(inputProps: any) => (
                                <Input 
                                  {...inputProps}
                                  placeholder="(00) 00000-0000"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={updating}>
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                      Atualize sua senha para manter sua conta segura
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.history.back()}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha Atual</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirme a Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={changingPassword}>
                      {changingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        "Alterar Senha"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}