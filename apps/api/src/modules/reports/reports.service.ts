import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthlySales(referenceDate?: string) {
    const now = referenceDate ? new Date(referenceDate) : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { totalCents: true },
    });

    const totalCents = orders.reduce((acc, order) => acc + order.totalCents, 0);
    const avgTicketCents = orders.length ? Math.round(totalCents / orders.length) : 0;

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      orders: orders.length,
      totalCents,
      avgTicketCents,
    };
  }

  async firstResponseSlaHours() {
    const conversations = await this.prisma.conversation.findMany({
      where: { lastInboundAt: { not: null } },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { direction: true, createdAt: true },
        },
      },
    });

    const deltasHours: number[] = [];
    for (const convo of conversations) {
      const firstInbound = convo.messages.find((m) => m.direction === 'INBOUND');
      const firstOutbound = convo.messages.find((m) => m.direction === 'OUTBOUND');
      if (firstInbound && firstOutbound && firstOutbound.createdAt > firstInbound.createdAt) {
        const deltaMs = firstOutbound.createdAt.getTime() - firstInbound.createdAt.getTime();
        deltasHours.push(deltaMs / 1000 / 60 / 60);
      }
    }

    const averageHours = deltasHours.length
      ? Number((deltasHours.reduce((a, b) => a + b, 0) / deltasHours.length).toFixed(2))
      : null;

    return {
      conversationsMeasured: deltasHours.length,
      averageFirstResponseHours: averageHours,
    };
  }
}
