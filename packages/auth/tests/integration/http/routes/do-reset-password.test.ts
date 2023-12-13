/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { DoResetPasswordRequest, superSaveAuth } from '../../../..';
import { hash } from '../../../../src/auth/hash';
import { getResetPasswordTokenRepository, getUserRepository } from '../../../../src/db';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

const PASSWORD = 'foo-bar';
const NEW_PASSWORD = 'bar-foo';
const TOKEN = '1234xyz';

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('do reset password', () => {
  it.each([{ password: PASSWORD }, {}, { token: 'abc' }])(
    'returns a Bad Request on incorrect request',
    async (request) => {
      const superSave = await getSuperSave();

      const app = express();
      app.use(express.json());

      const auth = await superSaveAuth(superSave, {
        tokenSecret: 'secure',
      });
      const { router } = auth;
      authStop = auth.stop;

      app.use('/auth', router);

      await supertest(app).post('/auth/do-reset-password').send(request).expect(400);
    }
  );

  it('returns a failed response on unrecognized token', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request: DoResetPasswordRequest = {
      password: PASSWORD,
      token: TOKEN,
    };

    const response = await supertest(app)
      .post('/auth/do-reset-password')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.success).toStrictEqual(false);
    expect(response.body.data.reason).toEqual('INVALID_TOKEN');
  });

  it.each([undefined, jest.fn()])('resets the password for a valid token', async (doResetPasswordHook) => {
    const superSave = await getSuperSave();

    // Using the hook, this will contain the token to use.
    let resetToken = '';

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      hooks:
        doResetPasswordHook === undefined
          ? {
              requestResetPassword: (_user, token) => {
                resetToken = token;
              },
            }
          : {
              doResetPassword: doResetPasswordHook,
              requestResetPassword: (_user, token) => {
                resetToken = token;
              },
            },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash(PASSWORD);
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    // Login, so we can validate that all refresh tokens are invalidated
    const loginResponse = await supertest(app)
      .post('/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect('Content-Type', /json/)
      .expect(200);
    expect(loginResponse.body.data.authorized).toBe(true);

    // Then, request a reset token
    await supertest(app)
      .post('/auth/reset-password')
      .send({
        email: user.email,
      })
      .expect(201);

    const request: DoResetPasswordRequest = {
      password: NEW_PASSWORD,
      token: resetToken,
    };

    const response = await supertest(app)
      .post('/auth/do-reset-password')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.success).toStrictEqual(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();

    if (doResetPasswordHook !== undefined) {
      expect(doResetPasswordHook).toBeCalledWith(
        // We check on the partial value, because the lastLogin timestamp updates and can cause timing issues.
        expect.objectContaining({ email: user.email })
      );
    }

    // validate that we can login with the new password
    const newLoginResponse = await supertest(app)
      .post('/auth/login')
      .send({ email: user.email, password: NEW_PASSWORD })
      .expect('Content-Type', /json/)
      .expect(200);
    expect(newLoginResponse.body.data.authorized).toBe(true);

    // validate that the old refresh token has been invalidated
    const refreshResponse = await supertest(app)
      .post('/auth/refresh')
      .send({ token: loginResponse.body.data.refreshToken })
      .expect('Content-Type', /json/)
      .expect(401);
    expect(refreshResponse.body.data.success).toBe(false);
  });

  it('fails on an outdated token', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash(PASSWORD);
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    // Create an old token
    const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);
    await resetPasswordTokenRepository.create({
      userId: user.id,
      identifier: TOKEN,
      expires: Math.floor(new Date('2020-01-01 00:00:00').getTime() / 1000),
    });

    const request: DoResetPasswordRequest = {
      password: NEW_PASSWORD,
      token: TOKEN,
    };

    const response = await supertest(app)
      .post('/auth/do-reset-password')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.success).toBe(false);
    expect(response.body.data.reason).toEqual('INVALID_TOKEN');
  });
});
