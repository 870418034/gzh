import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe<TOutput = unknown> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<TOutput>) {}

  transform(value: unknown): TOutput {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          message: 'VALIDATION_ERROR',
          issues: err.issues,
        });
      }
      throw err;
    }
  }
}

