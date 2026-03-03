import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../components/api';
import { toastManager } from '../components/ui/Toast';

const RT_BASE = process.env.NEXT_PUBLIC_RT_URL ?? 'http://localhost:3001/realtime';

type RealtimeEventHandlers = {
  onConversationUpdated?: (data: any) => void;
  onMessageCreated?: (data: any) => void;
  onNewConversation?: (data: any) => void;
  onConversationAssigned?: (data: any) => void;
};

/**
 * Hook para gerenciar conexão WebSocket e eventos em tempo real
 */
export function useRealtime(handlers: RealtimeEventHandlers = {}) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Atualizar handlers quando mudarem
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socket = io(RT_BASE, {
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connected', () => {
      console.log('Conectado ao WebSocket');
    });

    socket.on('conversation.updated', (data: any) => {
      handlersRef.current.onConversationUpdated?.(data);
    });

    socket.on('message.created', (data: any) => {
      handlersRef.current.onMessageCreated?.(data);
      
      // Motivo: Notificar quando nova mensagem chega em conversa não atribuída
      if (data.conversationId && data.direction === 'INBOUND') {
        handlersRef.current.onNewConversation?.(data);
      }
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('Erro ao conectar WebSocket:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return { socket: socketRef.current, emit };
}
