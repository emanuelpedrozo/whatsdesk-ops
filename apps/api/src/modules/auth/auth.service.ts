import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        roleId: true,
      },
    });

    if (!user) throw new UnauthorizedException('Credenciais invalidas');

    const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    if (!valid) throw new UnauthorizedException('Credenciais invalidas');

    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true },
    });
    if (!role?.name) {
      throw new UnauthorizedException('Usuario sem perfil valido');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: role.name,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
    });

    return {
      accessToken,
      user: payload,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        roleId: true,
        department: { select: { id: true, name: true } },
      },
    });
    if (!user) return null;

    const role = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: role ? { name: role.name } : { name: 'Sem perfil' },
      department: user.department,
    };
  }
}
