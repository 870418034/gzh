import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ensureTestLicenseEnv, importTestLicense } from './license-test-utils';

describe('Personas (e2e)', () => {
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

  it('crud', async () => {
    const email = `u${Date.now()}@test.local`;
    const password = 'password123';
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const userId = reg.body.id as string;
    expect(userId).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/personas')
      .set('x-user-id', userId)
      .send({
        industry: 'tech',
        identity: 'developer',
        product: 'solo',
        region: 'CN',
        extraJson: { foo: 'bar' },
      })
      .expect(201);

    const personaId = created.body.id as string;
    expect(personaId).toBeTruthy();

    const list1 = await request(app.getHttpServer())
      .get('/personas')
      .set('x-user-id', userId)
      .expect(200);
    expect(Array.isArray(list1.body)).toBe(true);
    expect(list1.body.find((x: any) => x?.id === personaId)).toBeTruthy();

    const get1 = await request(app.getHttpServer())
      .get(`/personas/${personaId}`)
      .set('x-user-id', userId)
      .expect(200);
    expect(get1.body.id).toBe(personaId);
    expect(get1.body.region).toBe('CN');
    expect(get1.body.extraJson?.foo).toBe('bar');

    await request(app.getHttpServer())
      .patch(`/personas/${personaId}`)
      .set('x-user-id', userId)
      .send({ region: 'US' })
      .expect(200);

    const get2 = await request(app.getHttpServer())
      .get(`/personas/${personaId}`)
      .set('x-user-id', userId)
      .expect(200);
    expect(get2.body.region).toBe('US');

    await request(app.getHttpServer())
      .delete(`/personas/${personaId}`)
      .set('x-user-id', userId)
      .expect(200);

    const list2 = await request(app.getHttpServer())
      .get('/personas')
      .set('x-user-id', userId)
      .expect(200);
    expect(list2.body.find((x: any) => x?.id === personaId)).toBeFalsy();
  });
});
