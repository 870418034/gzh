import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelRouterService } from '../router/model-router.service';
import { TaskExecutorService } from '../tasks/task-executor.service';
import { TasksService } from '../tasks/tasks.service';

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {}

  // 尝试从回复中截取第一个 JSON 对象
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }

  return { raw: text, parseError: true };
}

@Injectable()
export class CopywritingWorker implements OnModuleInit {
  private readonly logger = new Logger(CopywritingWorker.name);

  constructor(
    private executor: TaskExecutorService,
    private prisma: PrismaService,
    private modelRouter: ModelRouterService,
    private tasks: TasksService,
  ) {}

  onModuleInit() {
    this.executor.register('copywriting_from_nothing', (taskId) =>
      this.process(taskId, 'copywriting_from_nothing'),
    );
    this.executor.register('copywriting_viral_rewrite', (taskId) =>
      this.process(taskId, 'copywriting_viral_rewrite'),
    );
  }

  private async process(taskId: string, expectedType: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;
    if (task.type !== expectedType) return;
    if (task.status === 'canceled') return;

    // 仅从 pending -> processing，避免覆盖 cancel/succeeded/failed
    const mark = await this.prisma.task.updateMany({
      where: { id: taskId, status: 'pending' },
      data: { status: 'processing' },
    });
    if (mark.count === 0) {
      const latest = await this.prisma.task.findUnique({ where: { id: taskId } });
      if (!latest || latest.status !== 'processing') return;
    }

    const startedAt = Date.now();

    try {
      const input = task.inputJson as any;
      const personaId: string | undefined = input?.personaId;

      const persona = personaId
        ? await this.prisma.persona
            .findFirst({
              where: { id: personaId, userId: task.userId },
              select: {
                industry: true,
                identity: true,
                product: true,
                region: true,
                extraJson: true,
              },
            })
            .catch(() => null)
        : null;

      const personaText = persona
        ? `人设信息：${JSON.stringify(persona)}`
        : '人设信息：未提供或未找到';

      const baseInstruction = `请只输出严格 JSON（不要 markdown、不要代码块），字段结构如下：\n` +
        `{\n` +
        `  "titleCandidates": ["..."],\n` +
        `  "hookCandidates": ["..."],\n` +
        `  "script": "...",\n` +
        `  "highlights": ["..."]\n` +
        `}`;

      const messages =
        expectedType === 'copywriting_from_nothing'
          ? ([
              {
                role: 'system',
                content:
                  '你是资深短视频文案策划，擅长在给定人设与选题模板下快速产出可拍的脚本文案。',
              },
              {
                role: 'user',
                content:
                  `${personaText}\n` +
                  `任务：无中生有文案生成。\n` +
                  `topicTemplate：${input?.topicTemplate ?? ''}\n` +
                  `其他输入：${JSON.stringify(input)}\n\n` +
                  `${baseInstruction}`,
              },
            ] as const)
          : ([
              {
                role: 'system',
                content:
                  '你是资深短视频爆款拆解与二创文案专家，擅长保持原意但更具传播力。',
              },
              {
                role: 'user',
                content:
                  `${personaText}\n` +
                  `任务：爆款二创。\n` +
                  `sourceUrl：${input?.sourceUrl ?? ''}\n` +
                  `rawText：\n${input?.rawText ?? ''}\n\n` +
                  `${baseInstruction}`,
              },
            ] as const);

      const r = await this.modelRouter.chat(task.userId, 'copywriting', messages as any);
      const output = safeJsonParse(r.content ?? '');

      const latencyMs = Date.now() - startedAt;
      await this.tasks.markSucceeded(taskId, {
        outputJson: output,
        provider: r.providerConnectionId ?? null,
        model: r.model ?? null,
        latencyMs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`copywriting task failed: ${msg}`);
      await this.tasks
        .markFailed(taskId, { errorCode: 'COPYWRITING_FAILED', errorMessage: msg })
        .catch(() => {});
    }
  }
}

