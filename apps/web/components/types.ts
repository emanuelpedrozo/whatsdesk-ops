export type Conversation = {
  id: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  lastMessageAt: string | null;
  contact: { id: string; name: string | null; phone: string };
  assignedTo?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  messages: Array<{ id: string; content: string | null; createdAt: string }>;
};

export type ConversationDetail = {
  id: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  contact: { id: string; name: string | null; phone: string };
  assignedTo?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  messages: Array<{
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    content: string | null;
    createdAt: string;
  }>;
};

export type Agent = {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  department?: { id: string; name: string } | null;
};

export type Department = {
  id: string;
  name: string;
  isActive: boolean;
};

export type OperationsDashboard = {
  kpis: {
    totalAtendimentos: number;
    iniciadosPeriodo: number;
    aguardandoAtendimento: number;
    emAtendimento: number;
    finalizados: number;
    agentesOnline: number;
    widgetsAcionados: number;
    tempoMedioEspera: string;
    tempoMedioAtendimento: string;
    avaliacaoAtendimento: number;
  };
  atendimentosPorAgente: Array<{
    agentId: string;
    agentName: string;
    atendimentos: number;
    finalizados: number;
  }>;
  atendimentosPorDepartamento: Array<{
    departamento: string;
    total: number;
    percentual: number;
  }>;
  slaPorConversa: Array<{
    conversationId: string;
    status: string;
    assignedTo: string | null;
    waitTime: string;
  }>;
};
export type QrSession = {
  status: 'DISCONNECTED' | 'WAITING_QR' | 'CONNECTED';
  qrDataUrl: string | null;
  updatedAt: string;
  mode: 'simulado' | 'baileys';
  lastError?: string | null;
  retryCount?: number;
};
