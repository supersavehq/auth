import express from 'express';
import supertest from 'supertest';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { getSuperSave } from '../../../utils/db';
import { superSaveAuth, middleware } from '../../../../build';

describe('authenticate', () => {
  it('successfully validated a valid token', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);
    app.get('/hello', middleware.authenticate, (_req, res) =>
      res.send(res.locals.auth.userId)
    );

    // First get a valid token
    const passwordHash = await hash('password');
    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(
      getUser({ password: passwordHash })
    );

    const request = { email: user.email, password: 'password' };
    const loginResponse = await supertest(app)
      .post('/auth/login')
      .send(request)
      .expect(200);

    const accessToken = loginResponse.body.data.accessToken;
    const response = await supertest(app)
      .get('/hello')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(response.text).toEqual(user.id);
  });

  it('rejects a request with no token.', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);
    app.get('/hello', middleware.authenticate, (_req, res) =>
      res.send(res.locals.auth.userId)
    );

    await supertest(app).get('/hello').expect(401);
  });

  it('rejects an outdated token.', async () => {
    // Set time in the past to generate an old token
    const now = new Date().getTime();
    jest.useFakeTimers().setSystemTime(new Date('2020-01-01').getTime());

    // initialize
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);
    app.get('/hello', middleware.authenticate, (_req, res) =>
      res.send(res.locals.auth.userId)
    );

    // First get a valid token
    const passwordHash = await hash('password');
    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(
      getUser({ password: passwordHash })
    );

    const request = { email: user.email, password: 'password' };
    const loginResponse = await supertest(app)
      .post('/auth/login')
      .send(request)
      .expect(200);

    const accessToken = loginResponse.body.data.accessToken;

    // restore the time to now
    jest.setSystemTime(now);

    await supertest(app)
      .get('/hello')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
