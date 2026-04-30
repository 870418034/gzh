import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { DigitalHumanController } from './digital-human.controller';

@Module({
  imports: [TasksModule],
  controllers: [DigitalHumanController],
})
export class DigitalHumanModule {}

