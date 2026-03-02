'use client';

import { FormEvent, useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, getJson } from '../api';
import type { ConversationDetail as ConversationDetailType } from '../types';
import { Button } from '../ui/Button';
import { toastManager } from '../ui/Toast';
import { useLoading } from '../../hooks/useLoading';

type ConversationDetailProps = {
  conversationId: string | null;
  whatsappAccountId: string | null;
  onRefresh: () => Promise<void>;
};

export function ConversationDetail({
  conversationId,
  whatsappAccountId,
  onRefresh,
}: ConversationDetailProps) {
  const [conversationDetail, setConversationDetail] = useState<ConversationDetailType | null>(null);
  const [replyText, setReplyText] = useState('');
  const { loading, withLoading } = useLoading();
  const chatLogRef = useRef<HTMLDivElement>(null);

  const loadDetail = useCallback(async () => {
    if (!conversationId) {
      setConversationDetail(null);
      return;
    }

    await withLoading(async () => {
      try {
        const detail = await getJson<ConversationDetailType>(`/conversations/${conversationId}`);
        setConversationDetail(detail);
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao carregar detalhes', 'error');
      }
    });
  }, [conversationId, withLoading]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [conversationDetail?.messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !conversationDetail || !whatsappAccountId) return;

    await withLoading(async () => {
      try {
        await apiFetch('/conversations/send-message', {
          method: 'POST',
          body: JSON.stringify({
            conversationId: conversationDetail.id,
            accountId: whatsappAccountId,
            to: conversationDetail.contact.phone,
            text: replyText.trim(),
          }),
        });
        toastManager.show('Mensagem enviada!', 'success');
        setReplyText('');

        // Recarregar detalhes
        const detail = await getJson<ConversationDetailType>(`/conversations/${conversationId}`);
        setConversationDetail(detail);
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao enviar mensagem', 'error');
      }
    });
  };

  if (!conversationId) {
    return (
      <article className="panel">
        <h2>Detalhe da Conversa</h2>
        <p>Selecione uma conversa para ver histórico e responder.</p>
      </article>
    );
  }

  if (!conversationDetail) {
    return (
      <article className="panel">
        <h2>Detalhe da Conversa</h2>
        <p>Carregando...</p>
      </article>
    );
  }

  return (
    <article className="panel">
      <h2>Detalhe da Conversa</h2>
      <p>
        <strong>{conversationDetail.contact.name ?? conversationDetail.contact.phone}</strong>
        {' | '}Status: {conversationDetail.status}
        {' | '}Atendente: {conversationDetail.assignedTo?.name ?? 'Não atribuído'}
      </p>
      <div className="chat-log" ref={chatLogRef}>
        {conversationDetail.messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.direction === 'OUTBOUND' ? 'out' : 'in'}`}>
            <div>{m.content ?? '[sem texto]'}</div>
            <small>{new Date(m.createdAt).toLocaleString('pt-BR')}</small>
          </div>
        ))}
      </div>
      <form className="reply-form" onSubmit={handleSendMessage}>
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Digite a resposta..."
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={!replyText.trim() || !whatsappAccountId}>
          Enviar
        </Button>
      </form>
    </article>
  );
}
