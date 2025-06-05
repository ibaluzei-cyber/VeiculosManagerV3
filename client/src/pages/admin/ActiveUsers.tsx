import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Monitor, Smartphone, Users, Clock, MapPin, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveUserSession {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  sessions: {
    id: number;
    deviceInfo: string;
    ipAddress: string;
    lastActivity: string;
    createdAt: string;
    sessionId: string;
  }[];
}

export default function ActiveUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all active users and their sessions
  const { data: activeUsers = [], isLoading, error } = useQuery<ActiveUserSession[]>({
    queryKey: ['/api/admin/active-users'],
  });

  // Terminate specific user session
  const terminateSessionMutation = useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: number, sessionId: string }) => {
      const response = await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Erro ao encerrar sessão');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sessão encerrada",
        description: "A sessão do usuário foi encerrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/active-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar sessão",
        variant: "destructive",
      });
    },
  });

  // Terminate all sessions for a user
  const terminateAllUserSessionsMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}/terminate-all-sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Erro ao encerrar todas as sessões');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sessões encerradas",
        description: `Todas as sessões do usuário foram encerradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/active-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar sessões do usuário",
        variant: "destructive",
      });
    },
  });

  const getDeviceIcon = (deviceInfo: string) => {
    if (deviceInfo.includes("iPhone") || deviceInfo.includes("Android") || deviceInfo.includes("Mobile")) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Administrador":
        return "bg-red-100 text-red-800";
      case "Cadastrador":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Agora mesmo";
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const getTotalSessions = () => {
    return activeUsers.reduce((total, user) => total + user.sessions.length, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Erro ao carregar usuários ativos</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Usuários Logados</h1>
          <p className="text-gray-600 mt-2">
            Visualize e gerencie todos os usuários conectados ao sistema
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Sessões Ativas</p>
                <p className="text-2xl font-bold">{getTotalSessions()}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {activeUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário ativo encontrado</p>
              <p className="text-sm mt-2">
                Não há usuários conectados ao sistema no momento
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeUsers.map((user) => (
            <Card key={user.userId} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>{user.userName}</span>
                      <Badge className={getRoleColor(user.userRole)}>
                        {user.userRole}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {user.userEmail} • {user.sessions.length} sessão{user.sessions.length !== 1 ? 'ões' : ''} ativa{user.sessions.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => terminateAllUserSessionsMutation.mutate(user.userId)}
                    disabled={terminateAllUserSessionsMutation.isPending}
                  >
                    Encerrar Todas as Sessões
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(session.deviceInfo)}
                        <div>
                          <p className="font-medium">{session.deviceInfo}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{session.ipAddress}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{getTimeAgo(session.lastActivity)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Iniciada: {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => terminateSessionMutation.mutate({ 
                          userId: user.userId, 
                          sessionId: session.sessionId 
                        })}
                        disabled={terminateSessionMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Encerrar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security Information */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Informações Importantes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Esta página mostra apenas usuários com sessões ativas no momento</p>
          <p>• Encerrar uma sessão desconecta o usuário imediatamente do sistema</p>
          <p>• Use com cautela - usuários podem perder trabalho não salvo</p>
          <p>• Todas as ações são registradas nos logs de segurança</p>
        </CardContent>
      </Card>
    </div>
  );
}