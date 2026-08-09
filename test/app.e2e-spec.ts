import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';

// The app validates its environment at boot; provide the minimum required.
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/agendox_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_CUSTOMER_SECRET ??= 'test-customer-secret';
process.env.LOG_LEVEL = 'silent';

import { AppModule } from '@app/app.module';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.setGlobalPrefix('api', { exclude: ['health', 'health/live'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200 and status ok (no DB dependency)', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server).get('/health/live').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('unknown routes return the standardized error envelope', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server).get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      path: '/api/v1/does-not-exist',
    });
    expect(typeof res.body.timestamp).toBe('string');
  });
});
