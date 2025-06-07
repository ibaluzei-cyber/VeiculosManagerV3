import { useEffect, useRef } from 'react';
import { useAuth } from './use-auth';

export function useHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    // Só ativar heartbeat se usuário estiver logado
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Função para enviar heartbeat
    const sendHeartbeat = async () => {
      if (!isActiveRef.current) return;
      
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.log('Heartbeat falhou - possível desconexão:', error);
      }
    };

    // Detectar quando a aba fica ativa/inativa
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (isActiveRef.current) {
        // Quando a aba volta a ficar ativa, enviar heartbeat imediatamente
        sendHeartbeat();
      }
    };

    // Detectar antes de fechar a página
    const handleBeforeUnload = () => {
      // Enviar um beacon para notificar o servidor sobre o fechamento
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/heartbeat', JSON.stringify({ closing: true }));
      }
    };

    // Configurar heartbeat a cada 2 minutos
    intervalRef.current = setInterval(sendHeartbeat, 2 * 60 * 1000);

    // Enviar heartbeat inicial
    sendHeartbeat();

    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return null; // Hook não renderiza nada
}