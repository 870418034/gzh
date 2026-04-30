import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TaskExecutorService } from '../tasks/task-executor.service';
import { TasksService } from '../tasks/tasks.service';
import { StoryboardGenerateSchema, type StoryboardGenerateDto } from './storyboard.dto';

function mustUserId(userId?: string) {
  if (!userId) throw new BadRequestException('x-user-id required for MVP');
  return userId;
}

@Controller('storyboard')
export class StoryboardController {
  constructor(
    private tasks: TasksService,
    private executor: TaskExecutorService,
  ) {}

  @Post('generate')
  async generate(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(StoryboardGenerateSchema)) dto?: StoryboardGenerateDto,
  ) {
    const type = 'storyboard_generate';
    const created = await this.tasks.create(mustUserId(userId), {
      type,
      inputJson: dto!,
    });
    this.executor.enqueue(created.id, type);
    return { taskId: created.id };
  }
}

