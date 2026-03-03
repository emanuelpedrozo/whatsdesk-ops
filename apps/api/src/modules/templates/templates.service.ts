import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(departmentId?: string, userId?: string) {
    return this.prisma.messageTemplate.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(userId ? { createdById: userId } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(dto: CreateTemplateDto, userId: string) {
    const created = await this.prisma.messageTemplate.create({
      data: {
        name: dto.name,
        content: dto.content,
        departmentId: dto.departmentId,
        createdById: userId,
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.audit.log('template.created', 'messageTemplate', created.id, userId, undefined, created);
    return created;
  }

  async update(id: string, dto: UpdateTemplateDto, userId: string) {
    const current = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Template not found');

    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        content: dto.content,
        departmentId: dto.departmentId,
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.audit.log('template.updated', 'messageTemplate', id, userId, current, updated);
    return updated;
  }

  async delete(id: string, userId: string) {
    const current = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Template not found');

    await this.prisma.messageTemplate.delete({ where: { id } });
    await this.audit.log('template.deleted', 'messageTemplate', id, userId, current, undefined);
    return { success: true };
  }
}
