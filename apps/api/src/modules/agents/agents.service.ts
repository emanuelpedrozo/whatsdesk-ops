import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { CreateAgentDto } from './dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list() {
    return this.prisma.user.findMany({
      where: { role: { name: 'Atendente' } },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setOnlineStatus(id: string, online: boolean, actorUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Atendente nao encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: online ? UserStatus.ACTIVE : UserStatus.INACTIVE },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    await this.audit.log('agent.status.updated', 'user', id, actorUserId, existing, updated);
    return updated;
  }

  async create(dto: CreateAgentDto, actorUserId?: string) {
    const role = await this.prisma.role.upsert({
      where: { name: 'Atendente' },
      update: {},
      create: { name: 'Atendente', description: 'Operacao de chat e vendas' },
    });

    const passwordHash = await bcrypt.hash(dto.password ?? 'atendente123', 10);

    const created = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: role.id,
        departmentId: dto.departmentId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.audit.log('agent.created', 'user', created.id, actorUserId, undefined, created);
    return created;
  }
}
