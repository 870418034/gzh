import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateAiConnectionSchema,
  UpdateAiConnectionSchema,
  TestAiConnectionSchema,
} from './ai-connections.dto';
import type { CreateAiConnectionDto, UpdateAiConnectionDto } from './ai-connections.dto';
import type { TestAiConnectionDto } from './ai-connections.dto';
import { AiConnectionsService } from './ai-connections.service';

function mustUserId(userId?: string) {
  if (!userId) throw new UnauthorizedException('X_USER_ID_REQUIRED');
  return userId;
}

@Controller('ai-connections')
export class AiConnectionsController {
  constructor(private svc: AiConnectionsService) {}

  @Get()
  list(@Headers('x-user-id') userId?: string) {
    return this.svc.list(mustUserId(userId));
  }

  @Post()
  create(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(CreateAiConnectionSchema))
    dto?: CreateAiConnectionDto,
  ) {
    return this.svc.create(mustUserId(userId), dto!);
  }

  @Patch(':id')
  update(
    @Headers('x-user-id') userId?: string,
    @Param('id') id?: string,
    @Body(new ZodValidationPipe(UpdateAiConnectionSchema))
    dto?: UpdateAiConnectionDto,
  ) {
    return this.svc.update(mustUserId(userId), id!, dto!);
  }

  @Delete(':id')
  remove(@Headers('x-user-id') userId?: string, @Param('id') id?: string) {
    return this.svc.remove(mustUserId(userId), id!);
  }

  @Post(':id/test')
  test(
    @Headers('x-user-id') userId?: string,
    @Param('id') id?: string,
    @Body(new ZodValidationPipe(TestAiConnectionSchema))
    dto?: TestAiConnectionDto,
  ) {
    return this.svc.testConnection(mustUserId(userId), id!, dto?.model);
  }
}
