import { Injectable } from '@nestjs/common';
import { RouterRulesSchema, type RouterRules } from '@aurora/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RouterService {
  constructor(private prisma: PrismaService) {}

  async getDefault(userId: string): Promise<RouterRules> {
    const profile = await this.prisma.routerProfile.findFirst({
      where: { userId, isDefault: true },
    });

    if (!profile) {
      // MVP 默认：确保 schema 结构正确；真正候选由前端在保存时填写并校验
      const fallbackDefault: RouterRules = {
        version: 1,
        global: {
          candidates: [{ connectionId: 'REPLACE_ME', model: 'REPLACE_ME' }],
        },
      };
      return fallbackDefault;
    }

    return RouterRulesSchema.parse(profile.routingRulesJson);
  }

  async setDefault(userId: string, rules: unknown) {
    const parsed = RouterRulesSchema.parse(rules);

    const existing = await this.prisma.routerProfile.findFirst({
      where: { userId, isDefault: true },
    });

    if (existing) {
      await this.prisma.routerProfile.update({
        where: { id: existing.id },
        data: { routingRulesJson: parsed },
      });
      return { ok: true, id: existing.id };
    }

    const created = await this.prisma.routerProfile.create({
      data: { userId, name: 'default', isDefault: true, routingRulesJson: parsed },
    });
    return { ok: true, id: created.id };
  }
}

