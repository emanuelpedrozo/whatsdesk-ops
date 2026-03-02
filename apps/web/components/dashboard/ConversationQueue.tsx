'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, getJson } from '../api';
import type { Agent, Conversation, Department } from '../types';
import { useDebounce } from '../../hooks/useDebounce';
import { useLoading } from '../../hooks/useLoading';
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'assign' | 'resolve';
    conversationId: string;
  } | null>(null);

  const { loading, withLoading } = useLoading();

  // Debounce dos filtros para buscar automaticamente
  const debouncedStatus = useDebounce(selectedStatus, 500);
  const debouncedAgentId = useDebounce(selectedAgentId, 500);
  const debouncedDepartmentId = useDebounce(selectedDepartmentId, 500);

  const loadConversations = useCallback(
    async (reset = false) => {
      await withLoading(async () => {
        const currentPage = reset ? 1 : page;
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        });
        if (debouncedStatus) params.append('status', debouncedStatus);
        if (debouncedAgentId) params.append('agentId', debouncedAgentId);
        if (debouncedDepartmentId) params.append('departmentId', debouncedDepartmentId);

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
    [debouncedStatus, debouncedAgentId, debouncedDepartmentId, page, withLoading]
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

  return (
    <>
      <article className="panel">
        <h2>Fila de Conversas</h2>
        <div className="toolbar wrap">
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
        </div>

        {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="rows">
              {conversations.map((c) => (
                <div key={c.id} className="row row-queue">
                  <span>{c.contact.name ?? c.contact.phone}</span>
                  <span>{c.assignedTo?.name ?? 'Não atribuído'}</span>
                  <span>{c.status}</span>
                  <Button
                    variant="primary"
                    disabled={!selectedAgentId}
                    onClick={() => setConfirmAction({ type: 'assign', conversationId: c.id })}
                  >
                    Assumir
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => setConfirmAction({ type: 'resolve', conversationId: c.id })}
                  >
                    Finalizar
                  </Button>
                  <Button
                    variant="neutral"
                    onClick={() => onSelectConversation(c.id)}
                  >
                    Detalhe
                  </Button>
                </div>
              ))}
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
          title={confirmAction.type === 'assign' ? 'Atribuir conversa' : 'Finalizar conversa'}
          message={
            confirmAction.type === 'assign'
              ? 'Tem certeza que deseja assumir esta conversa?'
              : 'Tem certeza que deseja finalizar esta conversa?'
          }
          confirmText="Confirmar"
          cancelText="Cancelar"
          variant={confirmAction.type === 'resolve' ? 'danger' : 'primary'}
          onConfirm={() => {
            if (confirmAction.type === 'assign') {
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
