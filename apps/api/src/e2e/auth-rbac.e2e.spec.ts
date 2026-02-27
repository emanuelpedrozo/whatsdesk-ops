import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/common/prisma.service';

describe('Auth + RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleRef.get(PrismaService);

    const supervisorRole = await prisma.role.upsert({
      where: { name: 'Supervisor' },
      update: {},
      create: { name: 'Supervisor' },
    });

    const attendantRole = await prisma.role.upsert({
      where: { name: 'Atendente' },
      update: {},
      create: { name: 'Atendente' },
    });

    const hash = await bcrypt.hash('admin123', 10);

    await prisma.user.upsert({
      where: { email: 'supervisor.e2e@local.dev' },
      update: { roleId: supervisorRole.id, passwordHash: hash },
      create: {
        email: 'supervisor.e2e@local.dev',
        name: 'Supervisor E2E',
        passwordHash: hash,
        roleId: supervisorRole.id,
      },
    });

    await prisma.user.upsert({
      where: { email: 'atendente.e2e@local.dev' },
      update: { roleId: attendantRole.id, passwordHash: hash },
      create: {
        email: 'atendente.e2e@local.dev',
        name: 'Atendente E2E',
        passwordHash: hash,
        roleId: attendantRole.id,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloqueia rota protegida sem token', async () => {
    await request(app.getHttpServer()).get('/api/agents').expect(401);
  });

  it('permite supervisor acessar rota administrativa', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'supervisor.e2e@local.dev', password: 'admin123' })
      .expect(201);

    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/agents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('nega atendente em rota administrativa', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'atendente.e2e@local.dev', password: 'admin123' })
      .expect(201);

    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bloqueado', email: 'x@x.com', password: '123456' })
      .expect(403);
  });
});
