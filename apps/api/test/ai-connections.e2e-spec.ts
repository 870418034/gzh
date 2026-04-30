import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

describe('AI Connections (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 让 e2e 可独立运行：若未配置 master key，则临时生成一个
    if (!process.env.AI_KEYS_MASTER_KEY_BASE64) {
      process.env.AI_KEYS_MASTER_KEY_BASE64 = crypto
        .randomBytes(32)
        .toString('base64');
    }

    await ensureTestLicenseEnv();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await importTestLicense(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('create + list', async () => {
    const email = `u${Date.now()}@test.local`;
    const password = 'password123';
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const userId = reg.body.id as string;
    expect(userId).toBeTruthy();

    await request(app.getHttpServer())
      .post('/ai-connections')
      .set('x-user-id', userId)
      .send({
        name: 'DeepSeek',
        type: 'openai_compatible',
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        auth: { type: 'bearer', apiKey: 'sk-test' },
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/ai-connections')
      .set('x-user-id', userId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((x: any) => x?.name === 'DeepSeek');
    expect(found).toBeTruthy();
    expect(found.baseUrl).toBe('https://api.deepseek.com/v1');
  });
});
