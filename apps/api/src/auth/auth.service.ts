import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(email: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('EMAIL_TAKEN');

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS');

    return { id: user.id, email: user.email };
  }
}
