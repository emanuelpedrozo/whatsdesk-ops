import { Injectable } from '@nestjs/common';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { WhatsappWebhookDto } from './dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  async processWhatsappWebhook(payload: WhatsappWebhookDto) {
    const event = await this.prisma.webhookEvent.upsert({
      where: {
        source_externalEventId: {
          source: 'whatsapp',
          externalEventId: payload.eventId,
        },
      },
      update: {},
      create: {
        source: 'whatsapp',
        externalEventId: payload.eventId,
        payload: payload as never,
      },
    });

    if (event.processedAt) {
      return { deduplicated: true };
    }

    if (payload.messages?.length) {
      const defaultDepartment = await this.prisma.department.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      for (const incoming of payload.messages) {
        const contact = await this.prisma.contact.upsert({
          where: { phone: incoming.from },
          update: {},
          create: { phone: incoming.from, name: incoming.from },
        });

        const account = await this.prisma.whatsappAccount.findUnique({ where: { id: payload.accountId } });
        if (!account) continue;

        const conversation = await this.prisma.conversation.upsert({
          where: {
            id: `${payload.accountId}:${contact.id}`,
          },
          update: {
            lastMessageAt: new Date(),
            lastInboundAt: new Date(),
            departmentId: defaultDepartment?.id,
          },
          create: {
            id: `${payload.accountId}:${contact.id}`,
            whatsappAccountId: payload.accountId,
            contactId: contact.id,
            departmentId: defaultDepartment?.id,
            lastMessageAt: new Date(),
            lastInboundAt: new Date(),
          },
        });

        const message = await this.prisma.message.upsert({
          where: {
            whatsappAccountId_externalMessageId: {
              whatsappAccountId: payload.accountId,
              externalMessageId: incoming.id,
            },
          },
          update: {},
          create: {
            conversationId: conversation.id,
            whatsappAccountId: payload.accountId,
            externalMessageId: incoming.id,
            direction: MessageDirection.INBOUND,
            type: incoming.type ?? 'text',
            content: incoming.text,
            status: MessageStatus.RECEIVED,
          },
        });

        this.realtime.emitMessageCreated(message);
        this.realtime.emitConversationUpdated(conversation);
      }
    }

    if (payload.statuses?.length) {
      for (const status of payload.statuses) {
        const current = await this.prisma.message.findFirst({ where: { externalMessageId: status.id } });
        if (!current) continue;

        const updated = await this.prisma.message.update({
          where: { id: current.id },
          data: {
            status:
              status.status === 'delivered'
                ? MessageStatus.DELIVERED
                : status.status === 'read'
                  ? MessageStatus.READ
                  : status.status === 'failed'
                    ? MessageStatus.FAILED
                    : MessageStatus.SENT,
            deliveredAt: status.status === 'delivered' ? new Date() : current.deliveredAt,
            readAt: status.status === 'read' ? new Date() : current.readAt,
            failedReason: status.error,
          },
        });

        await this.audit.log('message.status.updated', 'message', updated.id, undefined, current, updated);
        this.realtime.emitMessageCreated(updated);
      }
    }

    await this.prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });

    return { deduplicated: false };
  }
}
