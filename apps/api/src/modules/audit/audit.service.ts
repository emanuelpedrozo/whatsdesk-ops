import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(action: string, entityType: string, entityId: string, actorUserId?: string, before?: unknown, after?: unknown) {
    await this.prisma.auditLog.create({
      data: { action, entityType, entityId, actorUserId, before: before as never, after: after as never },
    });
  }
}
