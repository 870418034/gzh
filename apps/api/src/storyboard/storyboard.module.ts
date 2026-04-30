import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RouterModule } from '../router/router.module';
import { TasksModule } from '../tasks/tasks.module';
import { StoryboardController } from './storyboard.controller';
import { StoryboardWorker } from './storyboard.worker';

@Module({
  imports: [PrismaModule, RouterModule, TasksModule],
  controllers: [StoryboardController],
  providers: [StoryboardWorker],
})
export class StoryboardModule {}

