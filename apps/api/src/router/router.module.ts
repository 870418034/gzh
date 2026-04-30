import { Module } from '@nestjs/common';
import { AiConnectionsModule } from '../ai-connections/ai-connections.module';
import { RouterController } from './router.controller';
import { ModelRouterService } from './model-router.service';
import { RouterService } from './router.service';

@Module({
  imports: [AiConnectionsModule],
  controllers: [RouterController],
  providers: [RouterService, ModelRouterService],
  exports: [RouterService, ModelRouterService],
})
export class RouterModule {}

