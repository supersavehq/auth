import express from 'express';
import supertest from 'supertest';
import { getSuperSave } from '../../../utils/db';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { superSaveAuth } from '../../../../build';

describe('login', () => {
  it('fails on non-existing account', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);

    const request = { email: 'user@example.com', password: 'foobar' };

    const response = await supertest(app)
      .post('/auth/login')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.authorized).toBe(false);
  });

  it('fails on an invalid password', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { email: user.email, password: 'foo-bar' };
    const response = await supertest(app)
      .post('/auth/login')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.authorized).toBe(false);
  });

  it('returns tokens on a valid password', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const authRouter = await superSaveAuth(superSave);
    app.use('/auth', authRouter);

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { email: user.email, password: 'password' };

    const response = await supertest(app)
      .post('/auth/login')
      .send(request)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.authorized).toBe(true);
  });
});
