import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('Copywriting Tasks (e2e)', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // 让 e2e 可独立运行：若未配置 master key，则临时生成一个
    if (!process.env.AI_KEYS_MASTER_KEY_BASE64) {
      process.env.AI_KEYS_MASTER_KEY_BASE64 = crypto
        .randomBytes(32)
        .toString('base64');
    }

    // mock 外部模型调用（ModelRouterService 内部使用 fetch）
    (global.fetch as any) = jest.fn(async () => {
      const content = JSON.stringify({
        titleCandidates: ['标题1', '标题2'],
        hookCandidates: ['钩子1', '钩子2'],
        script: '这是一段示例脚本文案',
        highlights: ['亮点1', '亮点2'],
      });

      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content } }] }),
      } as any;
    });

    await ensureTestLicenseEnv();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await importTestLicense(app);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app?.close();
  });

  it('create-from-nothing => task succeeded', async () => {
    const email = `u${Date.now()}@test.local`;
    const password = 'password123';
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const userId = reg.body.id as string;
    expect(userId).toBeTruthy();

    const conn = await request(app.getHttpServer())
      .post('/ai-connections')
      .set('x-user-id', userId)
      .send({
        name: 'MockConn',
        type: 'openai_compatible',
        baseUrl: 'https://example.com/v1',
        defaultModel: 'mock-model',
        auth: { type: 'bearer', apiKey: 'sk-test' },
      })
      .expect(201);

    const connectionId = conn.body.id as string;
    expect(connectionId).toBeTruthy();

    await request(app.getHttpServer())
      .put('/router/profile')
      .set('x-user-id', userId)
      .send({
        version: 1,
        global: { candidates: [{ connectionId, model: 'mock-model' }] },
        byFeature: { copywriting: { candidates: [{ connectionId, model: 'mock-model' }] } },
      })
      .expect(200);

    const persona = await request(app.getHttpServer())
      .post('/personas')
      .set('x-user-id', userId)
      .send({ industry: 'tech', identity: 'dev', product: 'solo', region: 'CN' })
      .expect(201);
    const personaId = persona.body.id as string;
    expect(personaId).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/copywriting/create-from-nothing')
      .set('x-user-id', userId)
      .send({ personaId, topicTemplate: '介绍 SOLO 的优势' })
      .expect(201);

    const taskId = created.body.taskId as string;
    expect(taskId).toBeTruthy();

    // 轮询等待 setImmediate 的 worker 执行完成
    let last: any = null;
    for (let i = 0; i < 50; i++) {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('x-user-id', userId)
        .expect(200);
      last = res.body;
      if (last.status === 'succeeded') break;
      if (last.status === 'failed') break;
      await sleep(20);
    }

    expect(last?.status).toBe('succeeded');
    expect(last?.outputJson?.script).toBe('这是一段示例脚本文案');
    expect(typeof last?.outputJson?.titleCandidates?.[0]).toBe('string');

    expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
  });
});
