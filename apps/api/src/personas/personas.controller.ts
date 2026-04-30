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
  CreatePersonaSchema,
  UpdatePersonaSchema,
} from './personas.dto';
import type { CreatePersonaDto, UpdatePersonaDto } from './personas.dto';
import { PersonasService } from './personas.service';

function mustUserId(userId?: string) {
  if (!userId) throw new UnauthorizedException('X_USER_ID_REQUIRED');
  return userId;
}

@Controller('personas')
export class PersonasController {
  constructor(private svc: PersonasService) {}

  @Get()
  list(@Headers('x-user-id') userId?: string) {
    return this.svc.list(mustUserId(userId));
  }

  @Post()
  create(
    @Headers('x-user-id') userId?: string,
    @Body(new ZodValidationPipe(CreatePersonaSchema)) dto?: CreatePersonaDto,
  ) {
    return this.svc.create(mustUserId(userId), dto!);
  }

  @Get(':id')
  get(@Headers('x-user-id') userId?: string, @Param('id') id?: string) {
    return this.svc.get(mustUserId(userId), id!);
  }

  @Patch(':id')
  update(
    @Headers('x-user-id') userId?: string,
    @Param('id') id?: string,
    @Body(new ZodValidationPipe(UpdatePersonaSchema)) dto?: UpdatePersonaDto,
  ) {
    return this.svc.update(mustUserId(userId), id!, dto!);
  }

  @Delete(':id')
  remove(@Headers('x-user-id') userId?: string, @Param('id') id?: string) {
    return this.svc.remove(mustUserId(userId), id!);
  }
}

