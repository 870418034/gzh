import { Injectable } from '@nestjs/common';
import {
  base64ToBytes,
  machineFingerprintHash,
  parseLicense,
  type License,
  verifyLicenseSignature,
} from '@aurora/licensing';
import { machineId } from 'node-machine-id';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type LicenseStatus = {
  active: boolean;
  reason?: string;
  publicKeyConfigured: boolean;
  licensePath: string;
  machineFingerprintHash: string;
  license?: License;
};

@Injectable()
export class LicenseService {
  private fingerprintPromise: Promise<string> | null = null;

  getLicensePath(): string {
    const userDataDir = process.env.AURORA_USER_DATA_DIR;
    if (userDataDir) return path.resolve(userDataDir, 'license.json');
    return path.resolve(process.cwd(), 'data', 'license.json');
  }

  private async getMachineFingerprintHash(): Promise<string> {
    if (!this.fingerprintPromise) {
      this.fingerprintPromise = (async () => {
        const id = await machineId(); // node-machine-id 内部会做跨平台兼容
        return machineFingerprintHash({ nodeMachineId: id });
      })();
    }
    return this.fingerprintPromise;
  }

  private getPublicKeyBytes(): Uint8Array | null {
    const b64 = process.env.AURORA_LICENSE_PUBLIC_KEY_BASE64;
    if (!b64) return null;
    try {
      return base64ToBytes(b64);
    } catch {
      return null;
    }
  }

  async readLicenseFromDisk(): Promise<License | null> {
    const licensePath = this.getLicensePath();
    if (!existsSync(licensePath)) return null;
    const raw = await fs.readFile(licensePath, 'utf8');
    const json = JSON.parse(raw);
    return parseLicense(json);
  }

  async writeLicenseToDisk(license: License): Promise<void> {
    const licensePath = this.getLicensePath();
    await fs.mkdir(path.dirname(licensePath), { recursive: true });
    await fs.writeFile(licensePath, JSON.stringify(license, null, 2), 'utf8');
  }

  async validateLicense(license: License): Promise<{ ok: true } | { ok: false; reason: string }> {
    const publicKey = this.getPublicKeyBytes();
    if (!publicKey) {
      return { ok: false, reason: '缺少配置：AURORA_LICENSE_PUBLIC_KEY_BASE64' };
    }

    const sigOk = await verifyLicenseSignature(license, publicKey);
    if (!sigOk) return { ok: false, reason: '许可证验签失败' };

    const now = Date.now();
    const expiresAt = new Date(license.expiresAt).getTime();
    if (!Number.isFinite(expiresAt)) return { ok: false, reason: '许可证 expiresAt 非法' };
    if (expiresAt <= now) return { ok: false, reason: '许可证已过期' };

    const fp = await this.getMachineFingerprintHash();
    if (license.machine.fingerprintHash !== fp) {
      return { ok: false, reason: '许可证与当前机器不匹配' };
    }

    return { ok: true };
  }

  async getStatus(): Promise<LicenseStatus> {
    const licensePath = this.getLicensePath();
    const publicKeyConfigured = Boolean(this.getPublicKeyBytes());
    const fp = await this.getMachineFingerprintHash();

    if (!publicKeyConfigured) {
      return {
        active: false,
        reason: '缺少配置：AURORA_LICENSE_PUBLIC_KEY_BASE64',
        publicKeyConfigured,
        licensePath,
        machineFingerprintHash: fp,
      };
    }

    let license: License | null = null;
    try {
      license = await this.readLicenseFromDisk();
    } catch (e: any) {
      return {
        active: false,
        reason: `读取许可证失败：${String(e?.message ?? e)}`,
        publicKeyConfigured,
        licensePath,
        machineFingerprintHash: fp,
      };
    }

    if (!license) {
      return {
        active: false,
        reason: '未导入许可证（license.json 不存在）',
        publicKeyConfigured,
        licensePath,
        machineFingerprintHash: fp,
      };
    }

    const ok = await this.validateLicense(license);
    if (!ok.ok) {
      return {
        active: false,
        reason: ok.reason,
        publicKeyConfigured,
        licensePath,
        machineFingerprintHash: fp,
        license,
      };
    }

    return {
      active: true,
      publicKeyConfigured,
      licensePath,
      machineFingerprintHash: fp,
      license,
    };
  }

  /**
   * 生成一个用于排查的“机器提示”，避免直接暴露 node-machine-id 值。
   */
  async getMachineHint(): Promise<string> {
    const fp = await this.getMachineFingerprintHash();
    return crypto.createHash('sha256').update(fp).digest('hex').slice(0, 12);
  }
}

