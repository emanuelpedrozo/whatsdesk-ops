import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.department.findMany({
      include: { _count: { select: { users: true, conversations: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: { name: dto.name },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Departamento nao encontrado');

    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }
}
