import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Monitor, Smartphone, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserSession {
  id: number;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user sessions
  const { data: sessions = [], isLoading, error } = useQuery<UserSession[]>({
    queryKey: ['/api/sessions'],
  });

  // Terminate specific session
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
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
        description: "A sessão foi encerrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar sessão",
        variant: "destructive",
      });
    },
  });

  // Terminate all other sessions
  const terminateAllOthersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sessions/terminate-others', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Erro ao encerrar outras sessões');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sessões encerradas",
        description: `${data.terminatedCount} sessões foram encerradas com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar outras sessões",
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
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
              <span>Erro ao carregar sessões ativas</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSession = sessions.find(session => session.isCurrent);
  const otherSessions = sessions.filter(session => !session.isCurrent);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Sessões</h1>
          <p className="text-gray-600 mt-2">
            Gerencie seus dispositivos conectados e sessões ativas
          </p>
        </div>
        {otherSessions.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => terminateAllOthersMutation.mutate()}
            disabled={terminateAllOthersMutation.isPending}
          >
            Encerrar Todas as Outras Sessões
          </Button>
        )}
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getDeviceIcon(currentSession.deviceInfo)}
              <span>Sessão Atual</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Ativo agora
              </Badge>
            </CardTitle>
            <CardDescription>
              Esta é a sua sessão atual neste dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Dispositivo:</span>
                <p className="text-gray-600">{currentSession.deviceInfo}</p>
              </div>
              <div>
                <span className="font-medium">Endereço IP:</span>
                <p className="text-gray-600">{currentSession.ipAddress}</p>
              </div>
              <div>
                <span className="font-medium">Última atividade:</span>
                <p className="text-gray-600">{getTimeAgo(currentSession.lastActivity)}</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Iniciada em: {formatDate(currentSession.createdAt)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Outras Sessões Ativas</h2>
        
        {otherSessions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma outra sessão ativa encontrada</p>
                <p className="text-sm mt-2">
                  Você está conectado apenas neste dispositivo
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <Card key={session.id} className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(session.deviceInfo)}
                      <div>
                        <p className="font-medium">{session.deviceInfo}</p>
                        <p className="text-sm text-gray-600">
                          IP: {session.ipAddress} • {getTimeAgo(session.lastActivity)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Iniciada: {formatDate(session.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => terminateSessionMutation.mutate(session.id.toString())}
                      disabled={terminateSessionMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Encerrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Security Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <span>Informações de Segurança</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Se você vir uma sessão que não reconhece, encerre-a imediatamente</p>
          <p>• Recomendamos fazer logout de dispositivos públicos ou compartilhados</p>
          <p>• As sessões expiram automaticamente após 24 horas de inatividade</p>
          <p>• Você pode encerrar todas as outras sessões como medida de segurança</p>
        </CardContent>
      </Card>
    </div>
  );
}