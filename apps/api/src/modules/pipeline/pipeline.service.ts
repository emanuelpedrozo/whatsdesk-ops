import { Injectable, NotFoundException } from '@nestjs/common';
import { DealStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { CreateDealDto, MoveDealDto } from './dto';

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  listStages() {
    return this.prisma.pipelineStage.findMany({ orderBy: { position: 'asc' } });
  }

  listDeals() {
    return this.prisma.deal.findMany({
      include: { contact: true, pipelineStage: true, assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createDeal(dto: CreateDealDto) {
    return this.prisma.deal.create({
      data: {
        title: dto.title,
        contactId: dto.contactId,
        pipelineStageId: dto.pipelineStageId,
        conversationId: dto.conversationId,
        valueCents: dto.valueCents,
      },
    });
  }

  async moveDeal(dealId: string, dto: MoveDealDto, actorUserId?: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const before = { ...deal };
    const status = dto.lostReason ? DealStatus.LOST : deal.status;

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        pipelineStageId: dto.toStageId,
        status,
        lostReason: dto.lostReason,
      },
    });

    await this.prisma.dealStageHistory.create({
      data: {
        dealId,
        fromStageId: deal.pipelineStageId,
        toStageId: dto.toStageId,
        changedByUserId: actorUserId,
        note: dto.note,
      },
    });

    await this.audit.log('deal.moved', 'deal', dealId, actorUserId, before, updated);
    this.realtime.emitDealMoved(updated);
    return updated;
  }
}
