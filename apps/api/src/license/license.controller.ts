import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { parseLicense } from '@aurora/licensing';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('status')
  async status() {
    return this.licenseService.getStatus();
  }

  /**
   * 导入许可证并写入 license.json。
   *
   * 支持两种 body：
   * 1) 直接传 license 对象
   * 2) { license: <license对象> }
   */
  @Post('import')
  async importLicense(@Body() body: any) {
    const raw = body && typeof body === 'object' && 'license' in body ? body.license : body;
    const license = parseLicense(raw);

    const checked = await this.licenseService.validateLicense(license);
    if (!checked.ok) {
      throw new BadRequestException(checked.reason);
    }

    await this.licenseService.writeLicenseToDisk(license);
    return this.licenseService.getStatus();
  }
}

