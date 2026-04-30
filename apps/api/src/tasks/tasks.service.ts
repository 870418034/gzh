import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CreateTaskInput = {
  type: string;
  inputJson: unknown;
  aiConnectionId?: string | null;
  model?: string | null;
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, input: CreateTaskInput) {
    const row = await this.prisma.task.create({
      data: {
        userId,
        type: input.type,
        status: 'pending',
        inputJson: input.inputJson as any,
        aiConnectionId: input.aiConnectionId ?? null,
        model: input.model ?? null,
      },
      select: { id: true },
    });
    return { id: row.id };
  }

  async list(
    userId: string,
    query?: { type?: string; status?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(query?.limit ?? 50, 1), 200);

    const rows = await this.prisma.task.findMany({
      where: {
        userId,
        ...(query?.type ? { type: query.type } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      inputJson: r.inputJson,
      outputJson: r.outputJson,
      provider: r.provider,
      model: r.model,
      aiConnectionId: r.aiConnectionId,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.task.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      inputJson: row.inputJson,
      outputJson: row.outputJson,
      provider: row.provider,
      model: row.model,
      aiConnectionId: row.aiConnectionId,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      latencyMs: row.latencyMs,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async cancel(userId: string, id: string) {
    const row = await this.prisma.task.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('NOT_FOUND');
    if (row.userId !== userId) throw new ForbiddenException('FORBIDDEN');

    if (['succeeded', 'failed', 'canceled'].includes(row.status)) {
      return { ok: true };
    }

    await this.prisma.task.update({
      where: { id },
      data: { status: 'canceled', errorCode: 'CANCELED' },
    });
    return { ok: true };
  }

  async markProcessing(taskId: string) {
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'processing' },
    });
  }

  async markSucceeded(taskId: string, data: { outputJson: unknown; provider?: string | null; model?: string | null; latencyMs?: number | null }) {
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'succeeded',
        outputJson: data.outputJson as any,
        provider: data.provider ?? null,
        model: data.model ?? null,
        latencyMs: data.latencyMs ?? null,
        errorCode: null,
        errorMessage: null,
      },
    });
  }

  async markFailed(taskId: string, data: { errorCode?: string | null; errorMessage?: string | null }) {
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorCode: data.errorCode ?? 'WORKER_FAILED',
        errorMessage: data.errorMessage ?? 'UNKNOWN',
      },
    });
  }
}

