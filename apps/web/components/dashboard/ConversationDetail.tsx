'use client';

import { FormEvent, useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { apiFetch, getJson } from '../api';
import type { ConversationDetail as ConversationDetailType, MessageTemplate, Agent } from '../types';
import { Button } from '../ui/Button';
import { toastManager } from '../ui/Toast';
import { useLoading } from '../../hooks/useLoading';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type ConversationDetailProps = {
  conversationId: string | null;
  whatsappAccountId: string | null;
  agents: Agent[];
  onRefresh: () => Promise<void>;
};

export function ConversationDetail({
  conversationId,
  whatsappAccountId,
  agents,
  onRefresh,
}: ConversationDetailProps) {
  const [conversationDetail, setConversationDetail] = useState<ConversationDetailType | null>(null);
  const [replyText, setReplyText] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedTransferAgent, setSelectedTransferAgent] = useState('');
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; action: string; actor?: { name: string } | null; createdAt: string }>>([]);
  const { loading, withLoading } = useLoading();
  const { me } = useAuth();
  const chatLogRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

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

  const loadTemplates = useCallback(async () => {
    try {
      const deps = await getJson<MessageTemplate[]>('/templates');
      setTemplates(deps);
    } catch {
      // Ignorar erro
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!conversationId) return;
    try {
      const hist = await getJson<Array<{ id: string; action: string; actor?: { name: string } | null; createdAt: string }>>(`/conversations/${conversationId}/history`);
      setHistory(hist);
    } catch {
      // Ignorar erro
    }
  }, [conversationId]);

  useEffect(() => {
    loadDetail();
    loadTemplates();
  }, [loadDetail, loadTemplates]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [conversationDetail?.messages]);

  // Motivo: Atalho Enter para enviar mensagem
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyText.trim() && !loading) {
        handleSendMessage(e as any);
      }
    }
  };

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

  const handleUseTemplate = (template: MessageTemplate) => {
    setReplyText(template.content);
    replyInputRef.current?.focus();
  };

  const handleTransfer = async () => {
    if (!selectedTransferAgent || !conversationId) return;

    await withLoading(async () => {
      try {
        await apiFetch(`/conversations/${conversationId}/transfer`, {
          method: 'PATCH',
          body: JSON.stringify({ userId: selectedTransferAgent }),
        });
        toastManager.show('Conversa transferida com sucesso!', 'success');
        setShowTransferDialog(false);
        await loadDetail();
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao transferir conversa', 'error');
      }
    });
  };

  const handleUpdatePriority = async () => {
    if (!selectedPriority || !conversationId) return;

    await withLoading(async () => {
      try {
        await apiFetch(`/conversations/${conversationId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: selectedPriority }),
        });
        toastManager.show('Prioridade atualizada!', 'success');
        setShowPriorityDialog(false);
        await loadDetail();
        await onRefresh();
      } catch (error: any) {
        toastManager.show(error.message || 'Erro ao atualizar prioridade', 'error');
      }
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays}d`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'NORMAL':
        return '#3b82f6';
      case 'LOW':
        return '#6b7280';
      default:
        return '#6b7280';
    }
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
    <>
      <article className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2>Detalhe da Conversa</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="neutral" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}>
              {showHistory ? 'Ocultar' : 'Histórico'}
            </Button>
            <Button variant="neutral" onClick={() => setShowPriorityDialog(true)}>
              Prioridade
            </Button>
            {conversationDetail.assignedTo && (
              <Button variant="neutral" onClick={() => setShowTransferDialog(true)}>
                Transferir
              </Button>
            )}
          </div>
        </div>
        {showHistory && (
          <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0, fontSize: '14px', fontWeight: 'bold' }}>Histórico de Ações</h3>
            {history.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#666' }}>Nenhuma ação registrada</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((h) => (
                  <div key={h.id} style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                    <strong>{h.action}</strong> por {h.actor?.name ?? 'Sistema'} em{' '}
                    {new Date(h.createdAt).toLocaleString('pt-BR')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p>
          <strong>{conversationDetail.contact.name ?? conversationDetail.contact.phone}</strong>
          {' | '}Status: {conversationDetail.status}
          {' | '}Atendente: {conversationDetail.assignedTo?.name ?? 'Não atribuído'}
          {conversationDetail.priority && (
            <>
              {' | '}Prioridade:{' '}
              <span style={{ color: getPriorityColor(conversationDetail.priority), fontWeight: 'bold' }}>
                {conversationDetail.priority}
              </span>
            </>
          )}
        </p>
        <div className="chat-log" ref={chatLogRef}>
          {conversationDetail.messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.direction === 'OUTBOUND' ? 'out' : 'in'}`}>
              <div>{m.content ?? '[sem texto]'}</div>
              <small>
                {getTimeAgo(m.createdAt)} ({new Date(m.createdAt).toLocaleString('pt-BR')})
              </small>
            </div>
          ))}
        </div>
        {templates.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <select
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value);
                if (template) handleUseTemplate(template);
              }}
              style={{ width: '100%', padding: '6px', borderRadius: '4px' }}
              defaultValue=""
            >
              <option value="">Selecione um template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <form className="reply-form" onSubmit={handleSendMessage}>
          <input
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite a resposta... (Enter para enviar)"
            disabled={loading}
          />
          <Button type="submit" loading={loading} disabled={!replyText.trim() || !whatsappAccountId}>
            Enviar
          </Button>
        </form>
      </article>

      {showTransferDialog && (
        <ConfirmDialog
          isOpen={true}
          title="Transferir Conversa"
          message="Selecione o atendente para transferir esta conversa:"
          confirmText="Transferir"
          cancelText="Cancelar"
          variant="primary"
          onConfirm={handleTransfer}
          onCancel={() => setShowTransferDialog(false)}
        >
          <select
            value={selectedTransferAgent}
            onChange={(e) => setSelectedTransferAgent(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '12px' }}
          >
            <option value="">Selecione um atendente...</option>
            {agents
              .filter((a) => a.id !== conversationDetail.assignedTo?.id)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.department ? `(${agent.department.name})` : ''}
                </option>
              ))}
          </select>
        </ConfirmDialog>
      )}

      {showPriorityDialog && (
        <ConfirmDialog
          isOpen={true}
          title="Definir Prioridade"
          message="Selecione a prioridade desta conversa:"
          confirmText="Atualizar"
          cancelText="Cancelar"
          variant="primary"
          onConfirm={handleUpdatePriority}
          onCancel={() => setShowPriorityDialog(false)}
        >
          <select
            value={selectedPriority || conversationDetail.priority || 'NORMAL'}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '12px' }}
          >
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </ConfirmDialog>
      )}
    </>
  );
}
