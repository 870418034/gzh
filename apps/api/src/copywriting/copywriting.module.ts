import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RouterModule } from '../router/router.module';
import { TasksModule } from '../tasks/tasks.module';
import { CopywritingController } from './copywriting.controller';
import { CopywritingWorker } from './copywriting.worker';

@Module({
  imports: [PrismaModule, RouterModule, TasksModule],
  controllers: [CopywritingController],
  providers: [CopywritingWorker],
})
export class CopywritingModule {}

