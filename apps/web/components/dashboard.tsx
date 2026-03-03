'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getJson, getAuthToken } from './api';
import { useAuth } from '../hooks/useAuth';
import { useLoading } from '../hooks/useLoading';
import type {
  Agent,
  Conversation,
  Department,
  OperationsDashboard,
} from './types';
import { LoginForm } from './dashboard/LoginForm';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { KPICards } from './dashboard/KPICards';
import { StatsPanels } from './dashboard/StatsPanels';
import { ConversationQueue } from './dashboard/ConversationQueue';
import { AgentManagement } from './dashboard/AgentManagement';
import { ConversationDetail } from './dashboard/ConversationDetail';
import { QRSection } from './dashboard/QRSection';
import { SLAPanel } from './dashboard/SLAPanel';
import { SummaryPanel } from './dashboard/SummaryPanel';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ToastContainer } from './ui/Toast';
import { Button } from './ui/Button';

const RT_BASE = process.env.NEXT_PUBLIC_RT_URL ?? 'http://localhost:3001/realtime';

type BootstrapPayload = {
  whatsappAccounts: Array<{ id: string; name: string }>;
  attendants: Array<{ id: string }>;
};

export function Dashboard() {
  const { me, loading: authLoading } = useAuth();
  const { loading: dataLoading, withLoading } = useLoading();

  const [ops, setOps] = useState<OperationsDashboard | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [myConversations, setMyConversations] = useState<Conversation[]>([]);

  async function loadAll() {
    await withLoading(async () => {
      try {
        const [dashboard, attendants, deps, boot] = await Promise.all([
          getJson<OperationsDashboard>('/operations/dashboard'),
          getJson<Agent[]>('/agents'),
          getJson<Department[]>('/departments'),
          getJson<BootstrapPayload>('/operations/bootstrap'),
        ]);

        setOps(dashboard);
        setAgents(attendants);
        setDepartments(deps);
        setBootstrap(boot);
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
      }
    });
  }

  async function loadMyConversations() {
    if (!me) return;
    try {
      const data = await getJson<{
        conversations: Conversation[];
        hasMore: boolean;
        total: number;
      }>(`/conversations?onlyMine=true&status=PENDING`);
      setMyConversations(data.conversations);
    } catch {
      // Ignorar erro
    }
  }

  useEffect(() => {
    if (!me) return;

    loadAll();

    const socket = io(RT_BASE, {
      transports: ['websocket'],
      auth: { token: getAuthToken() },
    });

    const refresh = () => {
      loadAll().catch(() => undefined);
      if (focusMode) loadMyConversations().catch(() => undefined);
    };
    socket.on('conversation.updated', refresh);
    socket.on('message.created', refresh);

    return () => {
      socket.disconnect();
    };
  }, [me]);

  if (authLoading) {
    return (
      <main className="ops-page">
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <>
        <LoginForm />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <main className="ops-page">
        <DashboardHeader userName={me.name} userRole={me.role.name} />

        {dataLoading && !ops ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : focusMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Modo Foco - Minhas Conversas</h2>
              <Button variant="neutral" onClick={() => { setFocusMode(false); loadAll(); }}>
                Sair do Modo Foco
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: '0 0 300px' }}>
                <div className="panel" style={{ maxHeight: '600px', overflow: 'auto' }}>
                  <h3>Minhas Conversas ({myConversations.length})</h3>
                  <div className="rows">
                    {myConversations.map((c) => (
                      <div
                        key={c.id}
                        className={`row ${selectedConversationId === c.id ? 'row-selected' : ''}`}
                        onClick={() => setSelectedConversationId(c.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <strong>{c.contact.name ?? c.contact.phone}</strong>
                          <br />
                          <small>{c.status} | {c.priority || 'NORMAL'}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <ConversationDetail
                  conversationId={selectedConversationId}
                  whatsappAccountId={bootstrap?.whatsappAccounts?.[0]?.id ?? null}
                  agents={agents}
                  onRefresh={async () => {
                    await loadAll();
                    await loadMyConversations();
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <Button variant="neutral" onClick={() => { setFocusMode(true); loadMyConversations(); }}>
                Modo Foco
              </Button>
            </div>
            {ops && <KPICards kpis={ops.kpis} />}
            {ops && <StatsPanels ops={ops} />}

            <section className="ops-grid">
              <ConversationQueue
                agents={agents}
                departments={departments}
                onSelectConversation={setSelectedConversationId}
                onRefresh={loadAll}
              />
              <AgentManagement agents={agents} departments={departments} onRefresh={loadAll} />
            </section>

            <section className="ops-grid">
              <QRSection
                whatsappAccountId={bootstrap?.whatsappAccounts?.[0]?.id ?? null}
                onRefresh={loadAll}
              />
              {ops && <SLAPanel slaPorConversa={ops.slaPorConversa} />}
            </section>

            <section className="ops-grid">
              <ConversationDetail
                conversationId={selectedConversationId}
                whatsappAccountId={bootstrap?.whatsappAccounts?.[0]?.id ?? null}
                agents={agents}
                onRefresh={loadAll}
              />
              <SummaryPanel
                whatsappAccountName={bootstrap?.whatsappAccounts?.[0]?.name ?? 'N/A'}
                agentsCount={agents.length}
                departmentsCount={departments.length}
              />
            </section>
          </>
        )}
      </main>
      <ToastContainer />
    </>
  );
}
