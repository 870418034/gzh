import { Injectable, Logger } from '@nestjs/common';

export type TaskHandler = (taskId: string) => Promise<void>;

/**
 * 内存执行器：
 * - 不依赖 Redis / BullMQ
 * - enqueue 后通过 setImmediate 异步执行 handler
 * - 避免在 module init 阶段连接外部服务，保证应用可在无 Redis 环境启动
 */
@Injectable()
export class TaskExecutorService {
  private readonly logger = new Logger(TaskExecutorService.name);
  private readonly handlers = new Map<string, TaskHandler>();

  register(type: string, handler: TaskHandler) {
    this.handlers.set(type, handler);
  }

  enqueue(taskId: string, type: string) {
    setImmediate(() => {
      const h = this.handlers.get(type);
      if (!h) {
        this.logger.warn(`No handler registered for task type: ${type}`);
        return;
      }

      h(taskId).catch((e) => {
        // 避免未捕获 promise rejection 影响测试进程
        const msg = e instanceof Error ? e.stack ?? e.message : String(e);
        this.logger.error(`Task ${taskId} failed: ${msg}`);
      });
    });
  }
}

