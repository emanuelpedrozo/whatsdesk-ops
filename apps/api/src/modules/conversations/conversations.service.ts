import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, MessageDirection, MessageStatus } from '@prisma/client';
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

  async list(query: ListConversationsQuery) {
    const { q, status, agentId, departmentId } = query;
    return this.prisma.conversation.findMany({
      where: {
        ...(q
          ? {
            OR: [
              { contact: { name: { contains: q, mode: 'insensitive' } } },
              { contact: { phone: { contains: q } } },
            ],
            }
          : {}),
        ...(status ? { status: status as ConversationStatus } : {}),
        ...(agentId ? { assignedToId: agentId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
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
      data: { assignedToId: userId, departmentId: user.departmentId ?? current.departmentId },
    });

    await this.audit.log('conversation.assigned', 'conversation', conversationId, actorUserId, current, updated);
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
}
