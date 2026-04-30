import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { LoginDtoSchema, RegisterDtoSchema } from './auth.dto';
import type { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto,
  ) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  async login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * MVP 临时鉴权：前端通过 header 传 `x-user-id`。
   * 后续可替换为 JWT/Cookie。
   */
  @Get('me')
  async me(@Headers('x-user-id') userId?: string) {
    if (!userId) return { authenticated: false };
    return { authenticated: true, userId };
  }
}
