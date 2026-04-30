import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePersonaDto, UpdatePersonaDto } from './personas.dto';

@Injectable()
export class PersonasService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.persona.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      industry: r.industry,
      identity: r.identity,
      product: r.product,
      region: r.region,
      extraJson: r.extraJson,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.persona.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return {
      id: row.id,
      industry: row.industry,
      identity: row.identity,
      product: row.product,
      region: row.region,
      extraJson: row.extraJson,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(userId: string, dto: CreatePersonaDto) {
    const row = await this.prisma.persona.create({
      data: {
        userId,
        industry: dto.industry,
        identity: dto.identity,
        product: dto.product,
        region: dto.region,
        extraJson: dto.extraJson as any,
      },
    });

    return { id: row.id };
  }

  async update(userId: string, id: string, dto: UpdatePersonaDto) {
    const row = await this.prisma.persona.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    await this.prisma.persona.update({
      where: { id },
      data: {
        industry: dto.industry,
        identity: dto.identity,
        product: dto.product,
        region: dto.region,
        extraJson: dto.extraJson as any,
      },
    });

    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.persona.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    await this.prisma.persona.delete({ where: { id } });
    return { ok: true };
  }
}

