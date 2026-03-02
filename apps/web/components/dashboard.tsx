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

  useEffect(() => {
    if (!me) return;

    loadAll();

    const socket = io(RT_BASE, {
      transports: ['websocket'],
      auth: { token: getAuthToken() },
    });

    const refresh = () => loadAll().catch(() => undefined);
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
        ) : (
          <>
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
