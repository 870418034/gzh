import { z } from 'zod';

/**
 * 数字人任务输入：
 * - templateId 必填
 * - 其他字段允许透传，方便后续接入真正的数字人生成链路
 */
export const DigitalHumanCreateJobSchema = z
  .object({
    templateId: z.string().min(1),
    script: z.string().min(1).optional(),
  })
  .passthrough();

export type DigitalHumanCreateJobDto = z.infer<typeof DigitalHumanCreateJobSchema>;

