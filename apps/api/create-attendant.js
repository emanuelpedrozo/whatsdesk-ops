const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const role = await p.role.upsert({
    where: { name: 'Atendente' },
    update: {},
    create: { name: 'Atendente', description: 'Operacao de chat e vendas' },
  });

  const existing = await p.user.findUnique({ where: { id: 'cmm4xuqtq0002g5enxavzfipe' } });
  if (!existing) {
    await p.user.create({
      data: {
        id: 'cmm4xuqtq0002g5enxavzfipe',
        email: 'atendente1@local.dev',
        name: 'Atendente 1',
        passwordHash: 'dev-no-auth',
        roleId: role.id,
      },
    });
  }

  const user = await p.user.findUnique({ where: { id: 'cmm4xuqtq0002g5enxavzfipe' } });
  console.log(JSON.stringify(user, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
