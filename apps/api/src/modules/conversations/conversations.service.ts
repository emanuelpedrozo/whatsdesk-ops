import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentAvailabilityStatus,
  ConversationPriority,
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ListConversationsQuery, SendMessageDto } from './dto';
import { WHATSAPP_PROVIDER } from '../integrations/whatsapp/whatsapp.module';
import { WhatsappProviderPort } from '../integrations/whatsapp/whatsapp-provider.port';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsappProviderPort,
  ) {}

  async list(query: ListConversationsQuery, currentUserId?: string) {
    const { q, status, agentId, departmentId, dateFrom, dateTo, onlyMine, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {
      ...(q
        ? {
            OR: [
              { contact: { name: { contains: q, mode: Prisma.QueryMode.insensitive } } },
              { contact: { phone: { contains: q } } },
            ],
          }
        : {}),
      ...(status ? { status: status as ConversationStatus } : {}),
      ...(agentId ? { assignedToId: agentId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(onlyMine && currentUserId ? { assignedToId: currentUserId } : {}),
      ...(dateFrom || dateTo
        ? {
            lastMessageAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: true,
          assignedTo: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: [
          { priority: 'desc' }, // Prioridade primeiro
          { lastMessageAt: 'desc' }, // Depois por data
        ],
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      hasMore: skip + conversations.length < total,
      total,
      page,
      limit,
    };
  }

  async getById(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async assign(conversationId: string, userId: string, actorUserId?: string) {
    const current = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!current) throw new NotFoundException('Conversation not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: userId, departmentId: user.departmentId ?? current.departmentId, status: 'PENDING' },
    });

    await this.audit.log('conversation.assigned', 'conversation', conversationId, actorUserId, current, updated);
    this.realtime.emitConversationUpdated(updated);
    return updated;
  }

  async selfAssign(conversationId: string, actorUserId: string) {
    const current = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!current) throw new NotFoundException('Conversation not found');
    const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: actorUserId, departmentId: user.departmentId ?? current.departmentId, status: 'PENDING' },
    });

    await this.audit.log('conversation.self-assigned', 'conversation', conversationId, actorUserId, current, updated);
    this.realtime.emitConversationUpdated(updated);
    return updated;
  }

  async sendMessage(dto: SendMessageDto, actorUserId?: string) {
    const convo = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId } });
    if (!convo) throw new NotFoundException('Conversation not found');

    const providerResult = await this.whatsapp.sendTextMessage({
      accountId: dto.accountId,
      to: dto.to,
      text: dto.text,
      conversationId: dto.conversationId,
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        whatsappAccountId: dto.accountId,
        externalMessageId: providerResult.externalMessageId,
        direction: MessageDirection.OUTBOUND,
        type: 'text',
        content: dto.text,
        status: MessageStatus.SENT,
        sentAt: new Date(providerResult.acceptedAt),
      },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: message.createdAt,
        slaFirstResponseAt: convo.slaFirstResponseAt ?? (convo.lastInboundAt ? message.createdAt : null),
      },
    });

    await this.audit.log('message.sent', 'message', message.id, actorUserId, undefined, message);
    this.realtime.emitMessageCreated(message);
    return message;
  }

  async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    actorUserId?: string,
  ) {
    const current = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!current) throw new NotFoundException('Conversation not found');

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });

    await this.audit.log('conversation.status.updated', 'conversation', conversationId, actorUserId, current, updated);
    this.realtime.emitConversationUpdated(updated);
    return updated;
  }

  async updatePriority(
    conversationId: string,
    priority: ConversationPriority,
    actorUserId?: string,
  ) {
    const current = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!current) throw new NotFoundException('Conversation not found');

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { priority },
    });

    await this.audit.log('conversation.priority.updated', 'conversation', conversationId, actorUserId, current, updated);
    this.realtime.emitConversationUpdated(updated);
    return updated;
  }

  /**
   * Motivo: Auto-atribui conversa para atendente disponível usando round-robin
   * Busca atendentes AVAILABLE do departamento da conversa e distribui igualmente
   */
  async autoAssign(conversationId: string): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { department: true },
    });
    if (!conversation || conversation.assignedToId) return false;

    // Motivo: Buscar atendentes disponíveis do departamento (ou todos se sem departamento)
    const availableAgents = await this.prisma.user.findMany({
      where: {
        role: { name: 'Atendente' },
        status: 'ACTIVE',
        availabilityStatus: AgentAvailabilityStatus.AVAILABLE,
        ...(conversation.departmentId ? { departmentId: conversation.departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        _count: {
          select: {
            conversations: {
              where: {
                status: { in: ['OPEN', 'PENDING'] },
              },
            },
          },
        },
      },
      orderBy: [
        { _count: { conversations: 'asc' } }, // Menor carga primeiro
        { updatedAt: 'asc' }, // Mais antigo primeiro (round-robin)
      ],
    });

    if (availableAgents.length === 0) return false;

    // Motivo: Selecionar atendente com menor carga
    const selectedAgent = availableAgents[0];

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedToId: selectedAgent.id,
        departmentId: selectedAgent.departmentId ?? conversation.departmentId,
        status: 'PENDING',
      },
    });

    await this.audit.log(
      'conversation.auto-assigned',
      'conversation',
      conversationId,
      undefined,
      conversation,
      updated,
    );
    this.realtime.emitConversationUpdated(updated);
    return true;
  }

  async transfer(conversationId: string, targetAgentId: string, actorUserId?: string) {
    const current = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!current) throw new NotFoundException('Conversation not found');
    const targetAgent = await this.prisma.user.findUnique({ where: { id: targetAgentId } });
    if (!targetAgent) throw new NotFoundException('Target agent not found');

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedToId: targetAgentId,
        departmentId: targetAgent.departmentId ?? current.departmentId,
      },
    });

    await this.audit.log('conversation.transferred', 'conversation', conversationId, actorUserId, current, updated);
    this.realtime.emitConversationUpdated(updated);
    return updated;
  }

  async getHistory(conversationId: string) {
    return this.audit.getHistory('conversation', conversationId);
  }
}
