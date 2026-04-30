import { z } from "zod";

export const RouterCandidateSchema = z.object({
  connectionId: z.string(),
  model: z.string().min(1)
});

export const RouterFallbackSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  switchOn: z
    .array(z.enum(["timeout", "429", "5xx", "insufficient_quota"]))
    .default(["timeout", "429", "5xx"])
});

export const RouterRulesSchema = z.object({
  version: z.literal(1),
  global: z.object({
    candidates: z.array(RouterCandidateSchema).min(1),
    fallback: RouterFallbackSchema.optional()
  }),
  byFeature: z
    .record(
      z.string(),
      z.object({ candidates: z.array(RouterCandidateSchema).min(1) })
    )
    .optional()
});

export type RouterRules = z.infer<typeof RouterRulesSchema>;
export type RouterCandidate = z.infer<typeof RouterCandidateSchema>;
