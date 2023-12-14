/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { superSaveAuth } from '../../../..';
import { getRefreshTokenRepository } from '../../../../src/db';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('refresh', () => {
  it.each([undefined, jest.fn()])('returns a new accessToken', async (refreshHook) => {
    const superSave = await getSuperSave();

    const refreshTokenRepository = getRefreshTokenRepository(superSave);

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
      hooks: refreshHook === undefined ? {} : { refresh: refreshHook },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // First make a user exists
    const registerRequest = {
      email: `refresh-test-${refreshHook ? 'withhook' : 'nohook'}@example.com`,
      password: 'fastpass',
    };
    const registerResponse = await supertest(app)
      .post('/auth/register')
      .send(registerRequest)
      .expect('Content-Type', /json/)
      .expect(200);

    const request = { token: registerResponse.body.data.refreshToken };

    const response = await supertest(app)
      .post('/auth/refresh')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    if (refreshHook !== undefined) {
      expect(refreshHook).toBeCalled();
    }

    // Check that the 'old' token is removed
    const oldTokenId = registerResponse.body.data.refreshToken.split('_')[0];
    const oldToken = await refreshTokenRepository.getById(oldTokenId);
    expect(oldToken).toBeNull();
  });

  it('fails when refresh token is not found', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request = { token: 'secure-token-id_aaa' };

    const response = await supertest(app)
      .post('/auth/refresh')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.data.success).toBe(false);
    expect(response.body.data.accessToken).not.toBeDefined();
  });
});
