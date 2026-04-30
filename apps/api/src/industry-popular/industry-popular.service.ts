import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateIndustryPopularItemDto, ListIndustryPopularItemsQuery } from "./industry-popular.dto";

@Injectable()
export class IndustryPopularService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, query: ListIndustryPopularItemsQuery) {
    const limit = query.limit ?? 50;
    const q = query.q?.trim();
    const rows = await this.prisma.industryPopularItem.findMany({
      where: {
        userId,
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.industry ? { industry: query.industry } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { notes: { contains: q } },
                { sourceUrl: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows;
  }

  async create(userId: string, dto: CreateIndustryPopularItemDto) {
    const row = await this.prisma.industryPopularItem.create({
      data: {
        userId,
        platform: dto.platform,
        industry: dto.industry,
        title: dto.title,
        sourceUrl: dto.sourceUrl,
        notes: dto.notes,
        metaJson: dto.meta ?? undefined,
      },
    });
    return { id: row.id };
  }

  async importBulk(userId: string, items: CreateIndustryPopularItemDto[]) {
    const created = await this.prisma.industryPopularItem.createMany({
      data: items.map((i) => ({
        userId,
        platform: i.platform,
        industry: i.industry,
        title: i.title,
        sourceUrl: i.sourceUrl,
        notes: i.notes,
        metaJson: i.meta ?? undefined,
      })),
    });
    return { ok: true, count: created.count };
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.industryPopularItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("NOT_FOUND");
    if (row.userId !== userId) throw new ForbiddenException("FORBIDDEN");
    await this.prisma.industryPopularItem.delete({ where: { id } });
    return { ok: true };
  }
}

