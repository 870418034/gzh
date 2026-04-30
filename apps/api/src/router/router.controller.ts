import { BadRequestException, Body, Controller, Get, Headers, Put } from '@nestjs/common';
import { RouterService } from './router.service';

function mustUserId(userId?: string) {
  if (!userId) throw new BadRequestException('x-user-id required for MVP');
  return userId;
}

@Controller('router')
export class RouterController {
  constructor(private svc: RouterService) {}

  @Get('profile')
  get(@Headers('x-user-id') userId?: string) {
    return this.svc.getDefault(mustUserId(userId));
  }

  @Put('profile')
  set(@Headers('x-user-id') userId?: string, @Body() body?: unknown) {
    return this.svc.setDefault(mustUserId(userId), body);
  }
}

