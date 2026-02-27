'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { apiFetch, getJson, getAuthToken, setAuthToken } from './api';
import type {
  Agent,
  Conversation,
  ConversationDetail,
  Department,
  OperationsDashboard,
  QrSession,
} from './types';

const RT_BASE = process.env.NEXT_PUBLIC_RT_URL ?? 'http://localhost:3001/realtime';

type BootstrapPayload = {
  whatsappAccounts: Array<{ id: string; name: string }>;
  attendants: Array<{ id: string }>;
};

type MePayload = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
};

export function Dashboard() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [email, setEmail] = useState('supervisor@local.dev');
  const [password, setPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');

  const [ops, setOps] = useState<OperationsDashboard | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [qrInfo, setQrInfo] = useState('');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [replyText, setReplyText] = useState('');

  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('atendente123');
  const [newAgentDepartmentId, setNewAgentDepartmentId] = useState('');

  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthError('');

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setAuthError('Login invalido');
      return;
    }

    const body = (await res.json()) as { accessToken: string };
    setAuthToken(body.accessToken);
    await loadAll();
  }

  async function loadAll() {
    try {
      const [meData, dashboard, convs, attendants, deps, boot] = await Promise.all([
        getJson<MePayload>('/auth/me'),
        getJson<OperationsDashboard>('/operations/dashboard'),
        getJson<Conversation[]>(
          `/conversations?status=${encodeURIComponent(selectedStatus)}&agentId=${encodeURIComponent(
            selectedAgentId,
          )}&departmentId=${encodeURIComponent(selectedDepartmentId)}`,
        ),
        getJson<Agent[]>('/agents'),
        getJson<Department[]>('/departments'),
        getJson<BootstrapPayload>('/operations/bootstrap'),
      ]);

      setMe(meData);
      setOps(dashboard);
      setConversations(convs);
      setAgents(attendants);
      setDepartments(deps);
      setBootstrap(boot);
      try {
        const qr = await getJson<QrSession>('/qr/session');
        setQrSession(qr);
      } catch {
        setQrSession(null);
      }

      if (!selectedAgentId && attendants.length > 0) setSelectedAgentId(attendants[0].id);
      if (!newAgentDepartmentId && deps.length > 0) setNewAgentDepartmentId(deps[0].id);

      if (selectedConversationId) {
        const detail = await getJson<ConversationDetail>(`/conversations/${selectedConversationId}`);
        setConversationDetail(detail);
      }
    } catch {
      setMe(null);
    }
  }

  async function refreshConversationDetail(id: string) {
    const detail = await getJson<ConversationDetail>(`/conversations/${id}`);
    setConversationDetail(detail);
    setSelectedConversationId(id);
  }

  useEffect(() => {
    if (!getAuthToken()) return;

    loadAll().catch(() => undefined);

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
  }, []);

  useEffect(() => {
    if (!qrSession || qrSession.status !== 'WAITING_QR') return;
    const timer = setInterval(async () => {
      try {
        const qr = await getJson<QrSession>('/qr/session');
        setQrSession(qr);
      } catch {
        // ignore polling error
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [qrSession]);

  const filteredConversations = useMemo(() => conversations.slice(0, 15), [conversations]);

  if (!me) {
    return (
      <main className="ops-page">
        <header className="ops-head">
          <h1>Painel de Atendimento WhatsApp</h1>
          <p>Entre com um usuario para acessar o painel operacional.</p>
        </header>
        <section className="panel" style={{ maxWidth: 520 }}>
          <h2>Login</h2>
          <form className="agent-form" onSubmit={login}>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Entrar</button>
          </form>
          {authError && <p className="small-error">{authError}</p>}
          <p className="small-hint">Usuarios seed: `admin@local.dev` / `supervisor@local.dev` com senha `admin123`.</p>
        </section>
      </main>
    );
  }

  const k = ops?.kpis;

  return (
    <main className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Painel de Atendimento WhatsApp</h1>
          <p>Usuario: {me.name} ({me.role.name})</p>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card"><h3>Total de Atendimentos</h3><strong>{k?.totalAtendimentos ?? 0}</strong></article>
        <article className="kpi-card"><h3>Iniciados no periodo</h3><strong>{k?.iniciadosPeriodo ?? 0}</strong></article>
        <article className="kpi-card alert"><h3>Aguardando atendimento</h3><strong>{k?.aguardandoAtendimento ?? 0}</strong></article>
        <article className="kpi-card focus"><h3>Em atendimento</h3><strong>{k?.emAtendimento ?? 0}</strong></article>
        <article className="kpi-card good"><h3>Finalizados</h3><strong>{k?.finalizados ?? 0}</strong></article>
      </section>

      <section className="kpi-grid secondary">
        <article className="kpi-card"><h3>Agentes online</h3><strong>{k?.agentesOnline ?? 0}</strong></article>
        <article className="kpi-card"><h3>Widgets acionados</h3><strong>{k?.widgetsAcionados ?? 0}</strong></article>
        <article className="kpi-card"><h3>Tempo medio de espera</h3><strong>{k?.tempoMedioEspera ?? '00:00'}</strong></article>
        <article className="kpi-card"><h3>Tempo medio de atendimento</h3><strong>{k?.tempoMedioAtendimento ?? '00:00'}</strong></article>
        <article className="kpi-card"><h3>Avaliacao do atendimento</h3><strong>{k?.avaliacaoAtendimento?.toFixed(1) ?? '5.0'} ★</strong></article>
      </section>

      <section className="ops-grid">
        <article className="panel">
          <h2>Atendimentos por Agente</h2>
          <div className="rows">
            {(ops?.atendimentosPorAgente ?? []).map((row) => (
              <div key={row.agentId} className="row">
                <span>{row.agentName}</span>
                <span>{row.atendimentos}</span>
                <span>{row.finalizados}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Atendimentos por Departamento</h2>
          <div className="rows">
            {(ops?.atendimentosPorDepartamento ?? []).map((row) => (
              <div key={row.departamento} className="row">
                <span>{row.departamento}</span>
                <span>{row.total}</span>
                <span>{row.percentual}%</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-grid">
        <article className="panel">
          <h2>Fila de Conversas</h2>
          <div className="toolbar wrap">
            <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
              <option value="">Selecionar atendente</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>

            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Todos status</option>
              <option value="OPEN">OPEN</option>
              <option value="PENDING">PENDING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <select value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)}>
              <option value="">Todos departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <button onClick={() => loadAll()}>Aplicar filtros</button>
          </div>

          <div className="rows">
            {filteredConversations.map((c) => (
              <div key={c.id} className="row row-queue">
                <span>{c.contact.name ?? c.contact.phone}</span>
                <span>{c.assignedTo?.name ?? 'Nao atribuido'}</span>
                <span>{c.status}</span>
                <button
                  disabled={!selectedAgentId}
                  onClick={async () => {
                    await apiFetch(`/conversations/${c.id}/assign`, {
                      method: 'PATCH',
                      body: JSON.stringify({ userId: selectedAgentId }),
                    });
                    await apiFetch(`/conversations/${c.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'PENDING' }),
                    });
                    await loadAll();
                  }}
                >
                  Assumir
                </button>
                <button
                  className="btn-success"
                  onClick={async () => {
                    await apiFetch(`/conversations/${c.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'RESOLVED' }),
                    });
                    await loadAll();
                  }}
                >
                  Finalizar
                </button>
                <button
                  className="btn-neutral"
                  onClick={() => refreshConversationDetail(c.id)}
                >
                  Detalhe
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Gestao de Atendentes</h2>
          <form
            className="agent-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await apiFetch('/agents', {
                method: 'POST',
                body: JSON.stringify({
                  name: newAgentName,
                  email: newAgentEmail,
                  password: newAgentPassword,
                  departmentId: newAgentDepartmentId || undefined,
                }),
              });
              setNewAgentName('');
              setNewAgentEmail('');
              setNewAgentPassword('atendente123');
              await loadAll();
            }}
          >
            <input placeholder="Nome do atendente" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
            <input placeholder="Email" value={newAgentEmail} onChange={(e) => setNewAgentEmail(e.target.value)} />
            <input placeholder="Senha inicial" value={newAgentPassword} onChange={(e) => setNewAgentPassword(e.target.value)} />
            <select value={newAgentDepartmentId} onChange={(e) => setNewAgentDepartmentId(e.target.value)}>
              <option value="">Sem departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button type="submit">Cadastrar atendente</button>
          </form>

          <div className="rows">
            {agents.map((agent) => (
              <div key={agent.id} className="row row-action">
                <span>{agent.name}</span>
                <span>{agent.department?.name ?? 'Sem departamento'}</span>
                <span>{agent.status === 'ACTIVE' ? 'Online' : 'Offline'}</span>
                <button
                  onClick={async () => {
                    await apiFetch(`/agents/${agent.id}/status`, {
                      method: 'PATCH',
                      body: JSON.stringify({ online: agent.status !== 'ACTIVE' }),
                    });
                    await loadAll();
                  }}
                >
                  {agent.status === 'ACTIVE' ? 'Colocar offline' : 'Colocar online'}
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-grid">
        <article className="panel">
          <h2>Conexao WhatsApp Web (QR)</h2>
          <p>
            Status: <strong>{qrSession?.status ?? 'N/A'}</strong> | Modo: {qrSession?.mode ?? 'simulado'} | Tentativas: {qrSession?.retryCount ?? 0}
          </p>
          {qrInfo && <p className="small-hint">{qrInfo}</p>}
          {qrSession?.lastError && <p className="small-error">Erro: {qrSession.lastError}</p>}
          {qrSession?.qrDataUrl && (
            <img src={qrSession.qrDataUrl} alt="QR WhatsApp Web" className="qr-image" />
          )}
          <div className="toolbar">
            <button
              onClick={async () => {
                setQrInfo('Iniciando sessao e aguardando QR...');
                const res = await apiFetch('/qr/session/start', {
                  method: 'POST',
                  body: JSON.stringify({ accountId: bootstrap?.whatsappAccounts?.[0]?.id }),
                });
                if (!res.ok) {
                  const txt = await res.text();
                  setQrInfo(`Falha ao gerar QR: ${txt}`);
                  return;
                }
                const session = (await res.json()) as QrSession;
                setQrSession(session);
                if (!session.qrDataUrl) {
                  setQrInfo('Sessao iniciada. Aguarde alguns segundos para o QR aparecer.');
                } else {
                  setQrInfo('QR gerado. Escaneie no WhatsApp.');
                }
              }}
            >
              Gerar QR
            </button>
            <button
              onClick={async () => {
                await apiFetch('/qr/session/confirm', { method: 'POST' });
                setQrInfo('Leitura confirmada (simulacao de validacao).');
                await loadAll();
              }}
            >
              Confirmar leitura
            </button>
            <button
              onClick={async () => {
                await apiFetch('/qr/session/disconnect', { method: 'POST' });
                setQrInfo('Sessao desconectada.');
                await loadAll();
              }}
            >
              Desconectar
            </button>
            <button
              onClick={async () => {
                await apiFetch('/qr/session/reset', { method: 'POST' });
                setQrInfo('Sessao resetada. Gere novo QR.');
                await loadAll();
              }}
            >
              Resetar sessao
            </button>
          </div>
        </article>

        <article className="panel">
          <h2>SLA por Conversa</h2>
          <div className="rows">
            {(ops?.slaPorConversa ?? []).map((item) => (
              <div key={item.conversationId} className="row">
                <span>{item.conversationId.slice(0, 18)}...</span>
                <span>{item.assignedTo ?? 'Nao atribuido'}</span>
                <span>{item.waitTime}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-grid">
        <article className="panel">
          <h2>Detalhe da Conversa</h2>
          {!conversationDetail ? (
            <p>Selecione uma conversa para ver historico e responder.</p>
          ) : (
            <>
              <p>
                <strong>{conversationDetail.contact.name ?? conversationDetail.contact.phone}</strong>
                {' | '}Status: {conversationDetail.status}
                {' | '}Atendente: {conversationDetail.assignedTo?.name ?? 'Nao atribuido'}
              </p>
              <div className="chat-log">
                {conversationDetail.messages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.direction === 'OUTBOUND' ? 'out' : 'in'}`}>
                    <div>{m.content ?? '[sem texto]'}</div>
                    <small>{new Date(m.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
              <form
                className="reply-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!replyText.trim() || !bootstrap?.whatsappAccounts[0]) return;
                  await apiFetch('/conversations/send-message', {
                    method: 'POST',
                    body: JSON.stringify({
                      conversationId: conversationDetail.id,
                      accountId: bootstrap.whatsappAccounts[0].id,
                      to: conversationDetail.contact.phone,
                      text: replyText.trim(),
                    }),
                  });
                  setReplyText('');
                  await refreshConversationDetail(conversationDetail.id);
                  await loadAll();
                }}
              >
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Digite a resposta..." />
                <button type="submit">Enviar</button>
              </form>
            </>
          )}
        </article>

        <article className="panel">
          <h2>Resumo da Sessao</h2>
          <p>Conta ativa: {bootstrap?.whatsappAccounts?.[0]?.name ?? 'N/A'}</p>
          <p>Atendentes cadastrados: {agents.length}</p>
          <p>Departamentos ativos: {departments.length}</p>
        </article>
      </section>
    </main>
  );
}
