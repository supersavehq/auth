/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { RequestResetPasswordRequest, superSaveAuth } from '../../../../../..';
import { hash } from '../../../../../../src/auth/hash';
import { getUserRepository } from '../../../../../../src/db';
import { getResetPasswordTokenRepository } from '../../../../../../src/methods/local-password/database';
import { clear } from '../../../../../mysql';
import { getSuperSave } from '../../../../../utils/database';
import { getUser } from '../../../../../utils/fixtures';

const PASSWORD = 'foo-bar';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('request reset password', () => {
  it('returns OK an a non-existing user', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const sendCallback = jest.fn();

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: sendCallback }],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const request: RequestResetPasswordRequest = {
      email: 'user@example.com',
    };

    await supertest(app).post('/auth/reset-password').send(request).expect(201);
    expect(sendCallback).not.toBeCalled();
  });

  it.each([undefined, jest.fn()])('generates an identifier when requested', async (requestResetPasswordHook) => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const sendCallback = jest.fn();

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: sendCallback }],
      hooks: requestResetPasswordHook === undefined ? {} : { requestResetPassword: requestResetPasswordHook },
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash(PASSWORD);
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request: RequestResetPasswordRequest = {
      email: user.email,
    };

    await supertest(app).post('/auth/reset-password').send(request).expect(201);
    expect(sendCallback).toBeCalledWith(user, expect.anything(), expect.anything());

    if (requestResetPasswordHook !== undefined) {
      expect(requestResetPasswordHook).toBeCalled();
    }

    const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);
    const tokens = await resetPasswordTokenRepository.getAll();
    expect(tokens).toHaveLength(1);
  });

  it('invalidates an already existing token for the same user', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    const passwordHash = await hash(PASSWORD);
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request: RequestResetPasswordRequest = {
      email: user.email,
    };

    await supertest(app).post('/auth/reset-password').send(request).expect(201);

    const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);
    const tokens = await resetPasswordTokenRepository.getAll();
    expect(tokens).toHaveLength(1);

    // request a new token, and check if the old one is invalidated
    await supertest(app).post('/auth/reset-password').send(request).expect(201);

    const newTokens = await resetPasswordTokenRepository.getAll();
    expect(newTokens).toHaveLength(1);
    expect(newTokens[0]?.identifier).not.toEqual(tokens[0]?.identifier);
  });
});
