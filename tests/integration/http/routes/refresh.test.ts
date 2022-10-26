import express from 'express';
import supertest from 'supertest';
import { getSuperSave } from '../../../utils/db';
import { getUser } from '../../../utils/fixtures';
import {
  getRefreshTokenRepository,
  getUserRepository,
} from '../../../../src/db';
import { superSaveAuth } from '../../../../build';
import { timeInSeconds } from '../../../../src/utils';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('refresh', () => {
  it.each([undefined, jest.fn()])(
    'returns a new accessToken',
    async (refreshHook) => {
      const superSave = await getSuperSave();

      const userRepository = getUserRepository(superSave);
      const user = await userRepository.create(getUser());

      const refreshTokenRepository = getRefreshTokenRepository(superSave);
      await refreshTokenRepository.create({
        // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
        id: 'secure-token-id',
        userId: user.id,
        expiresAt: timeInSeconds() + 99_999,
      });

      const app = express();
      app.use(express.json());
      const { router } = await superSaveAuth(superSave, {
        tokenSecret: 'secure',
        hooks:
          typeof refreshHook !== 'undefined' ? { refresh: refreshHook } : {},
      });
      app.use('/auth', router);

      const request = { token: 'secure-token-id' };

      const response = await supertest(app)
        .post('/auth/refresh')
        .send(request)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      if (typeof refreshHook !== 'undefined') {
        expect(refreshHook).toBeCalledWith(user);
      }
    }
  );

  it('fails when refresh token is not found', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    app.use('/auth', router);

    const request = { token: 'secure-token-id' };

    const response = await supertest(app)
      .post('/auth/refresh')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body.data.success).toBe(false);
    expect(response.body.data.accessToken).not.toBeDefined();
  });
});
