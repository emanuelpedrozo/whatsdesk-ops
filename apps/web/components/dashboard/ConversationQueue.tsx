'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, getJson } from '../api';
import type { Agent, Conversation, Department } from '../types';
import { useDebounce } from '../../hooks/useDebounce';
import { useLoading } from '../../hooks/useLoading';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { toastManager } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type ConversationQueueProps = {
  agents: Agent[];
  departments: Department[];
  onSelectConversation: (id: string) => void;
  onRefresh: () => Promise<void>;
};

export function ConversationQueue({
  agents,
  departments,
  onSelectConversation,
  onRefresh,
}: ConversationQueueProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'assign' | 'resolve' | 'self-assign';
    conversationId: string;
  } | null>(null);

  const { loading, withLoading } = useLoading();
  const { me } = useAuth();

  // Motivo: Contar conversas não atribuídas para badge
  const unreadCount = conversations.filter((c) => c.status === 'OPEN' && !c.assignedTo).length;

  // Motivo: Usar WebSocket para notificações em tempo real
  useRealtime({
    onConversationUpdated: () => {
      loadConversations(true).catch(() => undefined);
      onRefresh().catch(() => undefined);
    },
    onMessageCreated: (data) => {
      if (data.direction === 'INBOUND') {
        loadConversations(true).catch(() => undefined);
        onRefresh().catch(() => undefined);
      }
    },
    onNewConversation: (data) => {
      // Motivo: Notificar quando nova conversa chega
      const conversation = conversations.find((c) => c.id === data.conversationId);
      if (!conversation || conversation.assignedTo?.id === me?.id) {
        toastManager.show('Nova conversa recebida!', 'info');
      }
    },
  });

  // Debounce dos filtros para buscar automaticamente
  const debouncedStatus = useDebounce(selectedStatus, 500);
  const debouncedAgentId = useDebounce(selectedAgentId, 500);
  const debouncedDepartmentId = useDebounce(selectedDepartmentId, 500);
  const debouncedSearch = useDebounce(searchQuery, 500);

  const loadConversations = useCallback(
    async (reset = false) => {
      await withLoading(async () => {
        const currentPage = reset ? 1 : page;
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        });
        if (debouncedSearch) params.append('q', debouncedSearch);
        if (debouncedStatus) params.append('status', debouncedStatus);
        if (debouncedAgentId) params.append('agentId', debouncedAgentId);
        if (debouncedDepartmentId) params.append('departmentId', debouncedDepartmentId);
        if (onlyMine) params.append('onlyMine', 'true');
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        try {
          const data = await getJson<{
            conversations: Conversation[];
            hasMore: boolean;
            total: number;
            page: number;
            limit: number;
          }>(`/conversations?${params.toString()}`);

          if (reset) {
            setConversations(data.conversations);
            setPage(1);
          } else {
            setConversations((prev) => [...prev, ...data.conversations]);
          }
          setHasMore(data.hasMore);
        } catch (error: any) {
          toastManager.show(error.message || 'Erro ao carregar conversas', 'error');
        }
      });
    },
    [debouncedStatus, debouncedAgentId, debouncedDepartmentId, debouncedSearch, onlyMine, dateFrom, dateTo, page, withLoading]
  );

  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  const handleAssign = async (conversationId: string) => {
    if (!selectedAgentId) {
      toastManager.show('Selecione um atendente primeiro', 'warning');
      return;
    }

    try {
      await apiFetch(`/conversations/${conversationId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ userId: selectedAgentId }),
      });
      await apiFetch(`/conversations/${conversationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PENDING' }),
      });
      toastManager.show('Conversa atribuída com sucesso!', 'success');
      await onRefresh();
      await loadConversations(true);
    } catch (error: any) {
      toastManager.show(error.message || 'Erro ao atribuir conversa', 'error');
    }
  };

  const handleResolve = async (conversationId: string) => {
    try {
      await apiFetch(`/conversations/${conversationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      toastManager.show('Conversa finalizada!', 'success');
      await onRefresh();
      await loadConversations(true);
    } catch (error: any) {
      toastManager.show(error.message || 'Erro ao finalizar conversa', 'error');
    }
  };

  const handleSelfAssign = async (conversationId: string) => {
    try {
      await apiFetch(`/conversations/${conversationId}/self-assign`, {
        method: 'PATCH',
      });
      toastManager.show('Conversa atribuída para você!', 'success');
      await onRefresh();
      await loadConversations(true);
    } catch (error: any) {
      toastManager.show(error.message || 'Erro ao assumir conversa', 'error');
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
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

  const isNewConversation = (c: Conversation) => {
    if (c.status !== 'OPEN') return false;
    if (!c.lastMessageAt) return true;
    const lastMessage = new Date(c.lastMessageAt);
    const now = new Date();
    const diffHours = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Considera nova se última mensagem foi nas últimas 24h
  };

  const isMyConversation = (c: Conversation) => {
    return me && c.assignedTo?.id === me.id;
  };

  return (
    <>
      <article className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Fila de Conversas</h2>
          {unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {unreadCount} não atribuída{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div className="toolbar wrap">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
            <span>Apenas minhas</span>
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            aria-label="Filtrar por atendente"
          >
            <option value="">Todos os atendentes</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="OPEN">OPEN</option>
            <option value="PENDING">PENDING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            aria-label="Filtrar por departamento"
          >
            <option value="">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Data inicial"
            style={{ padding: '6px', borderRadius: '4px' }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Data final"
            style={{ padding: '6px', borderRadius: '4px' }}
          />
        </div>

        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="rows">
              {conversations.map((c) => {
                const isNew = isNewConversation(c);
                const isMine = isMyConversation(c);
                const lastMessage = c.messages?.[0];
                const preview = lastMessage?.content?.substring(0, 50) || '[sem mensagem]';

                return (
                  <div
                    key={c.id}
                    className={`row row-queue ${isMine ? 'row-my-conversation' : ''} ${isNew ? 'row-new' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontWeight: isNew ? 'bold' : 'normal' }}>
                        {c.contact.name ?? c.contact.phone}
                      </span>
                      {isNew && (
                        <span
                          style={{
                            background: '#ff4444',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          NOVA
                        </span>
                      )}
                      {isMine && (
                        <span
                          style={{
                            background: '#4CAF50',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          MINHA
                        </span>
                      )}
                    </div>
                    <span>{c.assignedTo?.name ?? 'Não atribuído'}</span>
                    <span>{c.status}</span>
                    <span style={{ fontSize: '12px', color: '#666' }} title={preview}>
                      {preview.length > 30 ? `${preview}...` : preview}
                    </span>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {getTimeAgo(c.lastMessageAt)}
                    </span>
                    {c.priority && (
                      <span
                        style={{
                          background: c.priority === 'URGENT' ? '#ef4444' : c.priority === 'HIGH' ? '#f59e0b' : '#6b7280',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        {c.priority}
                      </span>
                    )}
                    {c.status === 'OPEN' && !c.assignedTo && (
                      <Button
                        variant="primary"
                        onClick={() => setConfirmAction({ type: 'self-assign', conversationId: c.id })}
                        title="Assumir esta conversa para você"
                      >
                        Assumir para Mim
                      </Button>
                    )}
                    {c.status === 'OPEN' && c.assignedTo && (
                      <Button
                        variant="primary"
                        disabled={!selectedAgentId}
                        onClick={() => setConfirmAction({ type: 'assign', conversationId: c.id })}
                      >
                        Reatribuir
                      </Button>
                    )}
                    {c.status === 'PENDING' && (
                      <Button
                        variant="success"
                        onClick={() => setConfirmAction({ type: 'resolve', conversationId: c.id })}
                      >
                        Finalizar
                      </Button>
                    )}
                    <Button variant="neutral" onClick={() => onSelectConversation(c.id)}>
                      Detalhe
                    </Button>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    await loadConversations(false);
                  }}
                  loading={loading}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </article>

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmAction.type === 'self-assign'
              ? 'Assumir conversa'
              : confirmAction.type === 'assign'
                ? 'Atribuir conversa'
                : 'Finalizar conversa'
          }
          message={
            confirmAction.type === 'self-assign'
              ? 'Tem certeza que deseja assumir esta conversa para você?'
              : confirmAction.type === 'assign'
                ? 'Tem certeza que deseja atribuir esta conversa?'
                : 'Tem certeza que deseja finalizar esta conversa?'
          }
          confirmText="Confirmar"
          cancelText="Cancelar"
          variant={confirmAction.type === 'resolve' ? 'danger' : 'primary'}
          onConfirm={() => {
            if (confirmAction.type === 'self-assign') {
              handleSelfAssign(confirmAction.conversationId);
            } else if (confirmAction.type === 'assign') {
              handleAssign(confirmAction.conversationId);
            } else {
              handleResolve(confirmAction.conversationId);
            }
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
