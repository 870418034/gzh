import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

describe('Industry Popular (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await ensureTestLicenseEnv();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await importTestLicense(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('create + list + delete', async () => {
    const userId = `ip-${Date.now()}`;

    const created = await request(app.getHttpServer())
      .post('/industry-popular/items')
      .set('x-user-id', userId)
      .send({ title: '爆款示例', platform: 'douyin', industry: '测试' })
      .expect(201);

    expect(created.body.id).toBeTruthy();

    const listed = await request(app.getHttpServer())
      .get('/industry-popular/items?limit=10')
      .set('x-user-id', userId)
      .expect(200);

    expect(Array.isArray(listed.body)).toBe(true);
    expect(listed.body[0].title).toBe('爆款示例');

    await request(app.getHttpServer())
      .delete(`/industry-popular/items/${created.body.id}`)
      .set('x-user-id', userId)
      .expect(200);
  });
});
