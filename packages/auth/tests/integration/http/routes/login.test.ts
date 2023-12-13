/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { superSaveAuth } from '../../../..';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('login', () => {
  it('fails on non-existing account', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request = { email: 'user@example.com', password: 'foobar' };

    const response = await supertest(app).post('/auth/login').send(request).expect('Content-Type', /json/).expect(200);

    expect(response.body.data.authorized).toBe(false);
  });

  it('fails on an invalid password', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { email: user.email, password: 'foo-bar' };
    const response = await supertest(app).post('/auth/login').send(request).expect('Content-Type', /json/).expect(200);

    expect(response.body.data.authorized).toBe(false);
  });

  it.each([undefined, jest.fn()])('returns tokens on a valid password', async (loginHook) => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      hooks: loginHook === undefined ? {} : { login: loginHook },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { email: user.email, password: 'password' };

    const response = await supertest(app).post('/auth/login').send(request).expect('Content-Type', /json/).expect(200);

    expect(response.body.data.authorized).toBe(true);
    if (loginHook !== undefined) {
      expect(loginHook).toBeCalledWith(
        // We check on the partial value, because the lastLogin timestamp updates and can cause timing issues.
        expect.objectContaining({ email: user.email })
      );
    }
  });
});
