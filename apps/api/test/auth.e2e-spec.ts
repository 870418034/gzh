import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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

  it('register + login', async () => {
    const email = `u${Date.now()}@test.local`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(res.body.email).toBe(email);
    expect(res.body.id).toBeTruthy();
  });
});
