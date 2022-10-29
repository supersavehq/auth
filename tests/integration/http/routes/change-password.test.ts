import express, { Application } from 'express';
import supertest from 'supertest';
import { getSuperSave } from '../../../utils/db';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { superSaveAuth } from '../../../..';
import { clear } from '../../../mysql';

beforeEach(clear);

const PASSWORD = 'foo-bar';
const NEW_PASSWORD = 'foo-bar2';

async function getUserTokens(
  app: Application,
  email: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await supertest(app)
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect('Content-Type', /json/)
    .expect(200);

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}

describe('change-password', () => {
  it('expects a valid Authorization header', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    app.use('/auth', router);

    const request = {
      email: 'user@example.com',
      password: 'foobar',
      newPassword: 'foobar2',
    };

    await supertest(app)
      .post('/auth/change-password')
      .send(request)
      .set('Authorization', 'Bearer invalid-token')
      .expect('Content-Type', /json/)
      .expect(401);
  });

  it('fails on a non-existing account', async () => {
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

    const request = {
      email: 'user-not-existing@example.com',
      password: PASSWORD,
      newPassword: NEW_PASSWORD,
    };

    const { accessToken } = await getUserTokens(app, 'user@example.com');

    const response = await supertest(app)
      .post('/auth/change-password')
      .send(request)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.message).toBeDefined();
  });

  it('fails on an invalid password', async () => {
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

    const { accessToken } = await getUserTokens(app, 'user@example.com');

    const request = {
      email: user.email,
      password: 'invalid-pass',
      newPassword: NEW_PASSWORD,
    };
    const response = await supertest(app)
      .post('/auth/change-password')
      .send(request)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.message).toBeDefined();
  });

  it.each([undefined, jest.fn()])(
    'returns tokens on a valid password',
    async (changePasswordHook) => {
      const superSave = await getSuperSave();

      const app = express();
      app.use(express.json());
      const { router } = await superSaveAuth(superSave, {
        tokenSecret: 'secure',
        hooks:
          typeof changePasswordHook !== 'undefined'
            ? { login: changePasswordHook }
            : {},
      });
      app.use('/auth', router);

      const passwordHash = await hash(PASSWORD);
      const user = getUser({ password: passwordHash });
      const userRepository = getUserRepository(superSave);
      await userRepository.create(user);

      const { accessToken, refreshToken } = await getUserTokens(
        app,
        user.email
      );

      const request = {
        email: user.email,
        password: PASSWORD,
        newPassword: NEW_PASSWORD,
      };

      const response = await supertest(app)
        .post('/auth/change-password')
        .send(request)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      if (typeof changePasswordHook !== 'undefined') {
        expect(changePasswordHook).toBeCalledWith(
          // We check on the partial value, because the lastLogin timestamp updates and can cause timing issues.
          expect.objectContaining({ email: user.email })
        );
      }

      // validate that the refresh token has been invalidated.
      const refreshResponse = await supertest(app)
        .post('/auth/refresh')
        .send({ token: refreshToken })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(refreshResponse.body.data.success).toBe(false);

      // validate we can login with the new password
      const loginResponse = await supertest(app)
        .post('/auth/login')
        .send({ email: user.email, password: NEW_PASSWORD })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(loginResponse.body.data.authorized).toBe(true);
    }
  );
});
