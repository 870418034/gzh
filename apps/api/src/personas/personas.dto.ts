import { z } from 'zod';

export const CreatePersonaSchema = z.object({
  industry: z.string().min(1).optional(),
  identity: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  extraJson: z.unknown().optional(),
});
export type CreatePersonaDto = z.infer<typeof CreatePersonaSchema>;

export const UpdatePersonaSchema = CreatePersonaSchema.partial();
export type UpdatePersonaDto = z.infer<typeof UpdatePersonaSchema>;

