import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskExecutorService } from './task-executor.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, TaskExecutorService],
  exports: [TasksService, TaskExecutorService],
})
export class TasksModule {}

