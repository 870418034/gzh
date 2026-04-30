import { Module } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiConnectionsController } from './ai-connections.controller';
import { AiConnectionsService } from './ai-connections.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiConnectionsController],
  providers: [AiConnectionsService, CryptoService],
  exports: [AiConnectionsService],
})
export class AiConnectionsModule {}

