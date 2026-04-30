import { z } from 'zod';

export const AuthConfigSchema = z.union([
  z.object({ type: z.literal('bearer'), apiKey: z.string().min(1) }),
  z.object({
    type: z.literal('header'),
    headerName: z.string().min(1),
    apiKey: z.string().min(1),
  }),
  z.object({
    type: z.literal('query'),
    queryName: z.string().min(1),
    apiKey: z.string().min(1),
  }),
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const CreateAiConnectionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['openai_compatible', 'custom_http']),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().min(1).optional(),
  auth: AuthConfigSchema,
});
export type CreateAiConnectionDto = z.infer<typeof CreateAiConnectionSchema>;

export const UpdateAiConnectionSchema = CreateAiConnectionSchema.partial();
export type UpdateAiConnectionDto = z.infer<typeof UpdateAiConnectionSchema>;

export const TestAiConnectionSchema = z.object({
  /**
   * 可选：用指定模型做一次最小调用（若供应商不支持 /models）。
   * 未提供则优先使用连接的 defaultModel。
   */
  model: z.string().min(1).optional(),
});
export type TestAiConnectionDto = z.infer<typeof TestAiConnectionSchema>;
