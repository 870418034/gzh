import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TaskExecutorService } from '../tasks/task-executor.service';
import { TasksService } from '../tasks/tasks.service';
import {
  CreateFromNothingSchema,
  type CreateFromNothingDto,
  ViralSecondCreationSchema,
  type ViralSecondCreationDto,
} from './copywriting.dto';

function mustUserId(userId?: string) {
  if (!userId) throw new BadRequestException('x-user-id required for MVP');
  return userId;
}

@Controller('copywriting')
export class CopywritingController {
  constructor(
    private tasks: TasksService,
    private executor: TaskExecutorService,
  ) {}

  @Post('create-from-nothing')
  async createFromNothing(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(CreateFromNothingSchema)) dto?: CreateFromNothingDto,
  ) {
    const type = 'copywriting_from_nothing';
    const created = await this.tasks.create(mustUserId(userId), {
      type,
      inputJson: dto!,
    });
    this.executor.enqueue(created.id, type);
    return { taskId: created.id };
  }

  @Post('viral-second-creation')
  async viralSecondCreation(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(ViralSecondCreationSchema)) dto?: ViralSecondCreationDto,
  ) {
    const type = 'copywriting_viral_rewrite';
    const created = await this.tasks.create(mustUserId(userId), {
      type,
      inputJson: dto!,
    });
    this.executor.enqueue(created.id, type);
    return { taskId: created.id };
  }
}

