import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private readonly licenseService: LicenseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const originalUrl = (req as any).originalUrl ?? req.url ?? '';
    const pathname = String(originalUrl).split('?')[0] || '';

    // 白名单：健康检查与许可证管理接口
    if (pathname === '/health' || pathname.startsWith('/license')) return true;

    const status = await this.licenseService.getStatus();
    if (status.active) return true;

    // 403：没有满足“授权”条件
    throw new ForbiddenException(status.reason ?? 'License 未激活');
  }
}

