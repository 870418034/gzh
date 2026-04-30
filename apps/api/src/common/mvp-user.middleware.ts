import type { NextFunction, Request, Response } from "express";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * MVP 方案：前端通过 `x-user-id` 传入一个稳定的 userId。
 * 为避免外键约束导致的“用户不存在”，这里在所有带 `x-user-id` 的请求上自动 upsert 用户。
 *
 * 注意：
 * - 这不是最终鉴权方案（后续会替换为 JWT/Cookie/Session）
 * - 仅用于快速跑通原型
 */
@Injectable()
export class MvpUserMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const userId = req.header("x-user-id");
    if (!userId) return next();

    // 仅在需要触库的请求中才会真正连接 DB；若 DB 未启动，这些接口本来也不可用。
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@mvp.local`,
        passwordHash: "mvp"
      }
    });

    next();
  }
}

