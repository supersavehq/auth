/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { PartialConfig, RequestMagicLoginRequest, superSaveAuth } from '../../../../../..';
import { getUserRepository } from '../../../../../../src/db';
import { clear } from '../../../../../mysql';
import { getSuperSave } from '../../../../../utils/database';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('request magic login', () => {
  it('it fails on an invalid email address', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const sendMagicIdentifier = jest.fn();

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'magic-link', sendMagicIdentifier }],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request: RequestMagicLoginRequest = {
      email: 'user.example.com',
    };

    await supertest(app).post('/auth/get-magic-login').send(request).expect(400);
    expect(sendMagicIdentifier).not.toBeCalled();
  });

  it('it creates a user and generates a link', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const sendMagicIdentifier = jest.fn();

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'magic-link', sendMagicIdentifier }],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request: RequestMagicLoginRequest = {
      email: 'user@example.com',
    };

    await supertest(app).post('/auth/get-magic-login').send(request).expect(201);
    expect(sendMagicIdentifier).toBeCalled();

    const userRepository = getUserRepository(superSave);
    const users = await userRepository.getAll();
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe('user@example.com');
  });

  it.each([undefined, jest.fn()])('it re-uses an existing user and generates a link', async (hook) => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const sendMagicIdentifier = jest.fn();

    const config: PartialConfig = {
      tokenSecret: 'secure',
      methods: [{ type: 'magic-link', sendMagicIdentifier }],
    };
    if (hook) {
      config.hooks = { requestMagicLink: hook };
    }
    const auth = await superSaveAuth(superSave, config);
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request: RequestMagicLoginRequest = {
      email: 'user@example.com',
    };

    await supertest(app).post('/auth/get-magic-login').send(request).expect(201);
    expect(sendMagicIdentifier).toBeCalled();

    if (hook) {
      expect(hook).toBeCalled();
    }

    const userRepository = getUserRepository(superSave);
    const users = await userRepository.getAll();
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe('user@example.com');
  });
});
