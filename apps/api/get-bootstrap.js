const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const account = await p.whatsappAccount.findFirst();
  const users = await p.user.findMany({ select: { id: true, name: true, email: true } });
  const stages = await p.pipelineStage.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } });
  console.log(JSON.stringify({ account, users, stages }, null, 2));
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
