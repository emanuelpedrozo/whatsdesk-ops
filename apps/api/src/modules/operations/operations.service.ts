import { Injectable } from '@nestjs/common';
import { ConversationStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

function msToMMSS(ms: number | null) {
  if (!ms || Number.isNaN(ms)) return '00:00';
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap() {
    const [whatsappAccounts, attendants, departments] = await Promise.all([
      this.prisma.whatsappAccount.findMany({
        where: { isActive: true },
        select: { id: true, name: true, phoneNumber: true, provider: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: { name: 'Atendente' } },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      whatsappAccounts,
      attendants,
      departments,
    };
  }

  async dashboard() {
    const [
      conversations,
      attendants,
      automationRuns,
    ] = await Promise.all([
      this.prisma.conversation.findMany({
        include: {
          assignedTo: {
            include: { role: true },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { direction: true, createdAt: true },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: { name: 'Atendente' } },
        include: { role: true },
      }),
      this.prisma.automationRun.count(),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalAtendimentos = conversations.length;
    const iniciadosPeriodo = conversations.filter((c) => c.createdAt >= monthStart).length;
    const aguardandoAtendimento = conversations.filter(
      (c) => c.assignedToId === null && (c.status === ConversationStatus.OPEN || c.status === ConversationStatus.PENDING),
    ).length;
    const emAtendimento = conversations.filter(
      (c) => c.assignedToId !== null && (c.status === ConversationStatus.OPEN || c.status === ConversationStatus.PENDING),
    ).length;
    const finalizados = conversations.filter(
      (c) => c.status === ConversationStatus.RESOLVED || c.status === ConversationStatus.CLOSED,
    ).length;

    const agentesOnline = attendants.filter((u) => u.status === UserStatus.ACTIVE).length;

    const esperaMs: number[] = [];
    const atendimentoMs: number[] = [];

    for (const convo of conversations) {
      const firstInbound = convo.messages.find((m) => m.direction === 'INBOUND');
      const firstOutbound = convo.messages.find((m) => m.direction === 'OUTBOUND');
      const lastOutbound = [...convo.messages].reverse().find((m) => m.direction === 'OUTBOUND');

      if (firstInbound && firstOutbound && firstOutbound.createdAt >= firstInbound.createdAt) {
        esperaMs.push(firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime());
      }

      if (firstInbound && lastOutbound && lastOutbound.createdAt >= firstInbound.createdAt) {
        atendimentoMs.push(lastOutbound.createdAt.getTime() - firstInbound.createdAt.getTime());
      }
    }

    const avgEsperaMs = esperaMs.length
      ? esperaMs.reduce((sum, value) => sum + value, 0) / esperaMs.length
      : 0;
    const avgAtendimentoMs = atendimentoMs.length
      ? atendimentoMs.reduce((sum, value) => sum + value, 0) / atendimentoMs.length
      : 0;

    const atendimentosPorAgenteMap = new Map<string, {
      agentId: string;
      agentName: string;
      atendimentos: number;
      finalizados: number;
    }>();

    const atendimentosPorDepartamentoMap = new Map<string, number>();

    for (const convo of conversations) {
      const assigned = convo.assignedTo;
      if (assigned) {
        const current = atendimentosPorAgenteMap.get(assigned.id) ?? {
          agentId: assigned.id,
          agentName: assigned.name,
          atendimentos: 0,
          finalizados: 0,
        };

        current.atendimentos += 1;
        if (convo.status === ConversationStatus.RESOLVED || convo.status === ConversationStatus.CLOSED) {
          current.finalizados += 1;
        }
        atendimentosPorAgenteMap.set(assigned.id, current);

        const dept = assigned.role?.name ?? 'Sem departamento';
        atendimentosPorDepartamentoMap.set(dept, (atendimentosPorDepartamentoMap.get(dept) ?? 0) + 1);
      }
    }

    const atendimentosPorAgente = [...atendimentosPorAgenteMap.values()].sort(
      (a, b) => b.atendimentos - a.atendimentos,
    );

    const totalDepartamentos = [...atendimentosPorDepartamentoMap.values()].reduce((a, b) => a + b, 0);
    const atendimentosPorDepartamento = [...atendimentosPorDepartamentoMap.entries()].map(
      ([departamento, total]) => ({
        departamento,
        total,
        percentual: totalDepartamentos ? Number(((total / totalDepartamentos) * 100).toFixed(1)) : 0,
      }),
    );

    const slaPorConversa = conversations.slice(0, 20).map((c) => {
      const firstInbound = c.messages.find((m) => m.direction === 'INBOUND');
      const firstOutbound = c.messages.find((m) => m.direction === 'OUTBOUND');
      const waitMs =
        firstInbound && firstOutbound && firstOutbound.createdAt >= firstInbound.createdAt
          ? firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime()
          : null;

      return {
        conversationId: c.id,
        status: c.status,
        assignedTo: c.assignedTo?.name ?? null,
        waitTime: msToMMSS(waitMs),
      };
    });

    return {
      kpis: {
        totalAtendimentos,
        iniciadosPeriodo,
        aguardandoAtendimento,
        emAtendimento,
        finalizados,
        agentesOnline,
        widgetsAcionados: automationRuns,
        tempoMedioEspera: msToMMSS(avgEsperaMs),
        tempoMedioAtendimento: msToMMSS(avgAtendimentoMs),
        avaliacaoAtendimento: 5.0,
      },
      atendimentosPorAgente,
      atendimentosPorDepartamento,
      slaPorConversa,
    };
  }
}
