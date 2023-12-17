import express from 'express';
import supertest from 'supertest';
import { superSaveAuth } from '../../../..';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('Rate limit', () => {
  it('rejects a request based on the general rate limiting', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
      rateLimit: {
        general: {
          windowMs: 60_000,
          max: 1,
        },
        identifier: {
          windowMs: 60_000,
          max: 100_000,
        },
      },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // Invoke a function the first time
    await supertest(app).post('/auth/reset-password').send({ email: 'test@example.com' }).expect(201);

    // The second time we expect an error
    await supertest(app).post('/auth/reset-password').send({ email: 'test@example.com' }).expect(429);
  });

  test('it rejects an identifier request when repeated too often', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
      rateLimit: {
        general: {
          windowMs: 60_000,
          max: 100_000,
        },
        identifier: {
          windowMs: 60_000,
          max: 1,
        },
      },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // Invoke a function the first time
    await supertest(app).post('/auth/reset-password').send({ email: 'test@example.com' }).expect(201);

    // The second time we expect an error
    await supertest(app).post('/auth/reset-password').send({ email: 'test@example.com' }).expect(429);

    // but a different email not be rejected
    await supertest(app).post('/auth/reset-password').send({ email: 'other-user@example.com' }).expect(201);
  });
});
