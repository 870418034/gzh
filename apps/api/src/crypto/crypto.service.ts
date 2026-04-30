import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

function getKey(): Buffer {
  const b64 = process.env.AI_KEYS_MASTER_KEY_BASE64;
  if (!b64) throw new Error('AI_KEYS_MASTER_KEY_BASE64 missing');
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32)
    throw new Error('AI_KEYS_MASTER_KEY_BASE64 must decode to 32 bytes');
  return key;
}

@Injectable()
export class CryptoService {
  encryptJson(obj: unknown): string {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decryptJson<T>(b64: string): T {
    const key = getKey();
    const raw = Buffer.from(b64, 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  }
}

