import express from 'express';
import supertest from 'supertest';
import { getSuperSave } from '../../../utils/db';
import {
  getRefreshTokenRepository,
  getUserRepository,
} from '../../../../src/db';
import { superSaveAuth } from '../../../../build';
import { getUser } from '../../../utils/fixtures';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('register', () => {
  it.each([undefined, 'the name'])(
    'registers a user with name %s',
    async (name?: string) => {
      const superSave = await getSuperSave();

      const app = express();
      app.use(express.json());
      const { router } = await superSaveAuth(superSave, {
        tokenSecret: 'secure',
      });
      app.use('/auth', router);

      // Run
      const request = { email: 'user@example.com', password: 'fastpass', name };
      const response = await supertest(app)
        .post('/auth/register')
        .send(request)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body.data.success).toBe(true);
      const userRepository = await getUserRepository(superSave);
      const users = await userRepository.getByQuery(
        userRepository.createQuery().eq('email', 'user@example.com')
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.name).toEqual(name);

      const refreshTokenRepository = getRefreshTokenRepository(superSave);
      const token = await refreshTokenRepository.getById(
        response.body.data.refreshToken
      );
      expect(token).toBeDefined();
    }
  );

  it('invokes the registration callback if configured', async () => {
    const superSave = await getSuperSave();

    const registrationCallback = jest.fn();

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      hooks: {
        registration: registrationCallback,
      },
    });
    app.use('/auth', router);

    // Run
    const request = { email: 'user@example.com', password: 'fastpass' };
    const response = await supertest(app)
      .post('/auth/register')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body.data.success).toBe(true);
    const userRepository = await getUserRepository(superSave);
    const users = await userRepository.getByQuery(
      userRepository.createQuery().eq('email', 'user@example.com')
    );
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBeUndefined();

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const token = await refreshTokenRepository.getById(
      response.body.data.refreshToken
    );
    expect(token).toBeDefined();
    expect(registrationCallback).toBeCalled();
  });

  it('returns unsuccesful on existing user.', async () => {
    const superSave = await getSuperSave();

    const userRepository = await getUserRepository(superSave);
    const user = await userRepository.create(getUser());

    const app = express();
    app.use(express.json());
    const { router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    app.use('/auth', router);

    // Run
    const request = { email: user.email, password: 'secret-pass' };
    const response = await supertest(app)
      .post('/auth/register')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body.data.success).toBe(false);
  });
});
