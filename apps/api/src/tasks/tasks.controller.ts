import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

function mustUserId(userId?: string) {
  if (!userId) throw new BadRequestException('x-user-id required for MVP');
  return userId;
}

@Controller('tasks')
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get()
  list(
    @Headers('x-user-id') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.svc.list(mustUserId(userId), {
      type: type || undefined,
      status: status || undefined,
      limit: Number.isFinite(limit as any) ? limit : undefined,
    });
  }

  @Get(':id')
  get(@Headers('x-user-id') userId?: string, @Param('id') id?: string) {
    return this.svc.get(mustUserId(userId), id!);
  }

  @Post(':id/cancel')
  cancel(@Headers('x-user-id') userId?: string, @Param('id') id?: string) {
    return this.svc.cancel(mustUserId(userId), id!);
  }
}

