import express from 'express';
import { getSuperSave } from '../../../utils/db';
import { superSaveAuth, RequestResetPasswordRequest } from '../../../..';
import supertest from 'supertest';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import {
  getResetPasswordTokenRepository,
  getUserRepository,
} from '../../../../src/db';
import { clear } from '../../../mysql';

const PASSWORD = 'foo-bar';

beforeEach(clear);

describe('request reset password', () => {
  it('returns OK an a non-existing user', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    app.use('/auth', router);

    const request: RequestResetPasswordRequest = {
      email: 'user@example.com',
    };

    await supertest(app).post('/auth/reset-password').send(request).expect(201);
  });

  it.each([undefined, jest.fn()])(
    'generates an identifier when requested',
    async (requestResetPasswordHook) => {
      const superSave = await getSuperSave();

      const app = express();
      app.use(express.json());
      const { router } = await superSaveAuth(superSave, {
        tokenSecret: 'secure',
        hooks:
          typeof requestResetPasswordHook !== 'undefined'
            ? { requestResetPassword: requestResetPasswordHook }
            : {},
      });
      app.use('/auth', router);

      const passwordHash = await hash(PASSWORD);
      const user = getUser({ password: passwordHash });
      const userRepository = getUserRepository(superSave);
      await userRepository.create(user);

      const request: RequestResetPasswordRequest = {
        email: user.email,
      };

      await supertest(app)
        .post('/auth/reset-password')
        .send(request)
        .expect(201);

      if (typeof requestResetPasswordHook !== 'undefined') {
        expect(requestResetPasswordHook).toBeCalled();
      }

      const resetPasswordTokenRepository =
        await getResetPasswordTokenRepository(superSave);
      const tokens = await resetPasswordTokenRepository.getAll();
      expect(tokens).toHaveLength(1);
    }
  );

  it('invalidates an already existing token for the same user', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    app.use('/auth', router);

    const passwordHash = await hash(PASSWORD);
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request: RequestResetPasswordRequest = {
      email: user.email,
    };

    await supertest(app).post('/auth/reset-password').send(request).expect(201);

    const resetPasswordTokenRepository = await getResetPasswordTokenRepository(
      superSave
    );
    const tokens = await resetPasswordTokenRepository.getAll();
    expect(tokens).toHaveLength(1);

    // request a new token, and check if the old one is invalidated
    await supertest(app).post('/auth/reset-password').send(request).expect(201);

    const newTokens = await resetPasswordTokenRepository.getAll();
    expect(newTokens).toHaveLength(1);
    expect(newTokens[0]?.identifier).not.toEqual(tokens[0]?.identifier);
  });
});
