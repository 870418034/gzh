import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TasksService } from '../tasks/tasks.service';
import {
  DigitalHumanCreateJobSchema,
  type DigitalHumanCreateJobDto,
} from './digital-human.dto';

function mustUserId(userId?: string) {
  if (!userId) throw new BadRequestException('x-user-id required for MVP');
  return userId;
}

export type DigitalHumanTemplate = {
  id: string;
  name: string;
  description?: string;
};

const templates: DigitalHumanTemplate[] = [
  {
    id: 'news',
    name: '新闻体',
    description: '播报式/新闻播音腔：信息密度高、语速适中、语气更正式',
  },
  {
    id: 'warm',
    name: '温柔口播',
    description: '更亲和的讲述风格，适合生活方式/情感类内容',
  },
  {
    id: 'energetic',
    name: '元气带货',
    description: '更强情绪与节奏，适合营销/带货类内容',
  },
];

@Controller('digital-human')
export class DigitalHumanController {
  constructor(private tasks: TasksService) {}

  @Get('templates')
  listTemplates() {
    return templates;
  }

  @Post('jobs')
  async createJob(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(DigitalHumanCreateJobSchema))
    dto?: DigitalHumanCreateJobDto,
  ) {
    const type = 'digital_human_job';
    const created = await this.tasks.create(mustUserId(userId), {
      type,
      inputJson: dto!,
    });
    return { taskId: created.id };
  }

  @Get('jobs')
  listJobs(
    @Headers('x-user-id') userId?: string,
    @Query('status') status?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.tasks.list(mustUserId(userId), {
      type: 'digital_human_job',
      status: status || undefined,
      limit: Number.isFinite(limit as any) ? limit : undefined,
    });
  }
}

