import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import request from 'supertest';
import { machineId } from 'node-machine-id';
import {
  bytesToBase64,
  getPublicKey,
  machineFingerprintHash,
  signLicense,
  type License,
} from '@aurora/licensing';
import type { INestApplication } from '@nestjs/common';

const TEST_LICENSE_PRIVATE_KEY_SEED = new Uint8Array(Buffer.alloc(32, 7));

export async function ensureTestLicenseEnv() {
  // 将 license.json 写到每次 jest run 的独立临时目录里（globalSetup 已创建）
  const baseDir =
    process.env.TEST_SQLITE_TMP_DIR ?? path.join(os.tmpdir(), `aurora-api-license-${Date.now()}`);
  const workerId = process.env.JEST_WORKER_ID ?? '0';
  process.env.AURORA_USER_DATA_DIR = path.join(baseDir, `user-data-${workerId}`);

  const publicKey = await getPublicKey(TEST_LICENSE_PRIVATE_KEY_SEED);
  process.env.AURORA_LICENSE_PUBLIC_KEY_BASE64 = bytesToBase64(publicKey);

  // 每个测试用例尽量从“无 license”开始，避免并发与执行顺序导致的脏状态
  const licensePath = path.join(process.env.AURORA_USER_DATA_DIR, 'license.json');
  if (fs.existsSync(licensePath)) {
    try {
      fs.unlinkSync(licensePath);
    } catch {
      // ignore
    }
  }
}

export async function getCurrentMachineFingerprintHash(): Promise<string> {
  const id = await machineId();
  return machineFingerprintHash({ nodeMachineId: id });
}

export async function buildTestLicense(): Promise<License> {
  const fp = await getCurrentMachineFingerprintHash();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60); // 1h

  return signLicense(
    {
      version: 1,
      product: 'aurora-union-workbench',
      licenseId: crypto.randomBytes(8).toString('hex'),
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      machine: { fingerprintHash: fp, hint: 'jest' },
      features: {
        copywriting: true,
        storyboard: true,
        digitalHuman: true,
        industryPopular: true,
      },
    },
    TEST_LICENSE_PRIVATE_KEY_SEED,
  );
}

export async function importTestLicense(app: INestApplication) {
  const license = await buildTestLicense();
  await request(app.getHttpServer()).post('/license/import').send({ license }).expect(201);
  return license;
}
