import { z } from 'zod';

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = RegisterDtoSchema;
export type LoginDto = z.infer<typeof LoginDtoSchema>;

