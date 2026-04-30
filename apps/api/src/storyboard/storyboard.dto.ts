import { z } from 'zod';

/**
 * Storyboard 生成输入：
 * - MVP 仅要求 prompt 必填，其余字段透传到 task.inputJson（方便后续扩展）。
 */
export const StoryboardGenerateSchema = z
  .object({
    prompt: z.string().min(1),
    personaId: z.string().min(1).optional(),
  })
  .passthrough();

export type StoryboardGenerateDto = z.infer<typeof StoryboardGenerateSchema>;

