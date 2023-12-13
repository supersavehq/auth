/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { superSaveAuth } from '../../../..';
import { getRefreshTokenRepository, getUserRepository } from '../../../../src/db';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('register', () => {
  it.each([
    [undefined, undefined],
    ['the name', undefined],
  ])('registers a user with name %s', async (name, registrationHook) => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      hooks: registrationHook === undefined ? {} : { registration: registrationHook },
    });
    const { router } = auth;
    authStop = auth.stop;

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
    const userRepository = getUserRepository(superSave);
    const users = await userRepository.getByQuery(userRepository.createQuery().eq('email', 'user@example.com'));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toEqual(name);

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const token = await refreshTokenRepository.getById(response.body.data.refreshToken);
    expect(token).toBeDefined();
    if (registrationHook !== undefined) {
      expect(registrationHook).toBeCalledWith(users[0]);
    }
  });

  it('invokes the registration hook if configured', async () => {
    const superSave = await getSuperSave();

    const registrationHook = jest.fn();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      hooks: {
        registration: registrationHook,
      },
    });

    const { router } = auth;
    authStop = auth.stop;

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
    const userRepository = getUserRepository(superSave);
    const users = await userRepository.getByQuery(userRepository.createQuery().eq('email', 'user@example.com'));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBeUndefined();

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const token = await refreshTokenRepository.getById(response.body.data.refreshToken);
    expect(token).toBeDefined();
    expect(registrationHook).toBeCalled();
  });

  it('returns unsuccesful on existing user.', async () => {
    const superSave = await getSuperSave();

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(getUser());

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    const { router } = auth;
    authStop = auth.stop;

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
