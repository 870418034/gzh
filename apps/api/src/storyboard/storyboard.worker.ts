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
export class StoryboardWorker implements OnModuleInit {
  private readonly logger = new Logger(StoryboardWorker.name);

  constructor(
    private executor: TaskExecutorService,
    private prisma: PrismaService,
    private modelRouter: ModelRouterService,
    private tasks: TasksService,
  ) {}

  onModuleInit() {
    // TaskExecutorService 注册 handler：storyboard_generate
    this.executor.register('storyboard_generate', (taskId) =>
      this.process(taskId),
    );
  }

  private async process(taskId: string) {
    const expectedType = 'storyboard_generate';

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

      const baseInstruction =
        `请只输出严格 JSON（不要 markdown、不要代码块），字段结构如下：\n` +
        `{\n` +
        `  "shots": [\n` +
        `    {\n` +
        `      "index": 1,\n` +
        `      "durationSec": 3,\n` +
        `      "visual": "画面描述",\n` +
        `      "narration": "旁白/台词",\n` +
        `      "onScreenText": "可选，屏幕文字",\n` +
        `      "camera": "可选，镜头/运动"\n` +
        `    }\n` +
        `  ]\n` +
        `}`;

      const prompt = String(input?.prompt ?? '');
      const personaId = input?.personaId ? String(input.personaId) : '';

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

      const messages = [
        {
          role: 'system',
          content:
            '你是专业短视频分镜师与导演助理，擅长把想法拆成可拍的分镜（镜头、画面、台词、屏幕字幕）。',
        },
        {
          role: 'user',
          content:
            `${personaText}\n` +
            `任务：根据输入生成分镜 storyboard。\n` +
            `prompt：${prompt}\n` +
            `其他输入：${JSON.stringify(input)}\n\n` +
            `${baseInstruction}`,
        },
      ] as const;

      const r = await this.modelRouter.chat(task.userId, 'storyboard', messages as any);
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
      this.logger.error(`storyboard task failed: ${msg}`);
      await this.tasks
        .markFailed(taskId, {
          errorCode: 'STORYBOARD_FAILED',
          errorMessage: msg,
        })
        .catch(() => {});
    }
  }
}

