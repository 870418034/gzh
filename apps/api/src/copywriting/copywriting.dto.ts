import { z } from 'zod';

export const CreateFromNothingSchema = z
  .object({
    personaId: z.string().min(1),
    topicTemplate: z.string().min(1).optional(),
    extra: z.unknown().optional(),
  })
  .passthrough();

export type CreateFromNothingDto = z.infer<typeof CreateFromNothingSchema>;

export const ViralSecondCreationSchema = z
  .object({
    personaId: z.string().min(1),
    sourceUrl: z.string().url().optional(),
    rawText: z.string().min(1),
  })
  .passthrough();

export type ViralSecondCreationDto = z.infer<typeof ViralSecondCreationSchema>;

