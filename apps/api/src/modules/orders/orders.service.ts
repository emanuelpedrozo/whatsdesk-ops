import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateOrderDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list() {
    return this.prisma.order.findMany({
      include: { items: true, payments: true, contact: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: CreateOrderDto) {
    const subtotal = dto.items.reduce((acc, item) => acc + item.quantity * item.unitCents, 0);
    const total = subtotal - dto.discountCents + dto.shippingCents;

    const order = await this.prisma.order.create({
      data: {
        contactId: dto.contactId,
        dealId: dto.dealId,
        conversationId: dto.conversationId,
        subtotalCents: subtotal,
        discountCents: dto.discountCents,
        shippingCents: dto.shippingCents,
        totalCents: total,
        items: {
          create: dto.items.map((item) => ({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitCents: item.unitCents,
            totalCents: item.quantity * item.unitCents,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log('order.created', 'order', order.id, undefined, undefined, order);
    this.realtime.emitOrderCreated(order);
    return order;
  }
}
