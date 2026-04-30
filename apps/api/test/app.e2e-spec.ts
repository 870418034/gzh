import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    await ensureTestLicenseEnv();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('未激活 license 时访问受保护路由应返回 401/403', async () => {
    const res = await request(app.getHttpServer()).get('/').expect((r) => {
      expect([401, 403]).toContain(r.status);
    });
    expect(res.body?.message).toBeTruthy();
  });

  it('导入 license 后可访问受保护路由', async () => {
    await importTestLicense(app);
    await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
