import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const departamentoGeral = await prisma.department.upsert({
    where: { name: 'Geral' },
    update: {},
    create: { name: 'Geral' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Acesso total' },
  });

  const supervisorRole = await prisma.role.upsert({
    where: { name: 'Supervisor' },
    update: {},
    create: { name: 'Supervisor', description: 'Supervisao operacional' },
  });

  await prisma.role.upsert({
    where: { name: 'Atendente' },
    update: {},
    create: { name: 'Atendente', description: 'Operacao de chat e vendas' },
  });

  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@local.dev' },
    update: {},
    create: {
      email: 'admin@local.dev',
      name: 'Administrador',
      passwordHash: hash,
      roleId: adminRole.id,
      departmentId: departamentoGeral.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'supervisor@local.dev' },
    update: {},
    create: {
      email: 'supervisor@local.dev',
      name: 'Supervisor',
      passwordHash: hash,
      roleId: supervisorRole.id,
      departmentId: departamentoGeral.id,
    },
  });

  const stages = ['Novo Lead', 'Em conversa', 'Proposta enviada', 'Fechado', 'Pos-venda', 'Perdido'];
  for (const [position, name] of stages.entries()) {
    await prisma.pipelineStage.upsert({
      where: { name },
      update: { position },
      create: { name, position, isDefault: position === 0 },
    });
  }

  await prisma.whatsappAccount.upsert({
    where: { phoneNumber: '5511999999999' },
    update: {},
    create: {
      name: 'Conta Principal',
      provider: 'mock',
      phoneNumber: '5511999999999',
      businessAccount: 'waba-demo',
    },
  });

  await prisma.user.updateMany({
    where: { roleId: supervisorRole.id },
    data: { status: 'ACTIVE' },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
