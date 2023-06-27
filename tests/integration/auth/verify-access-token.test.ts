import { clear } from '../../mysql';
import { getSuperSave } from '../../utils/db';
import { superSaveAuth } from '../../..';
import express from 'express';
import supertest from 'supertest';
import { hash } from '../../../src/auth/hash';
import { getUserRepository } from '../../../src/db';
import { getUser } from '../../utils/fixtures';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  jest.useRealTimers();
  authStop();
});

describe('verifyAccessToken', () => {
  it('returns the userId on success', async () => {
    const superSave = await getSuperSave();

    // First set up a http endpoint, so we can create a user and generate a token.
    const app = express();
    app.use(express.json());

    const { stop, verifyAccessToken, router } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });

    authStop = stop;
    app.use('/auth', router);

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

    const result = await verifyAccessToken(accessToken);
    expect(result).toEqual(user.id);
  });

  it.each([
    ['invalid-token', 'Jwt cannot be parsed'],
    [
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJjV1FLWVZNYXY2VXVXSFJRcWlaUTROIiwianRpIjoiM2M2MTJhYWQtODU3NS00YWYwLWExN2ItYWMxMzg4N2M0ZTExIiwiaWF0IjoxNjg3ODQxMjgzLCJleHAiOjE2ODc4NDE1ODN9.A7gPBHUqXTlhlm35i7-qSsBrJKyaXRTETxvgH5arKGtshISiv6mDaHt6SWlC5bLxX9YhIeve7xOGH1DEqOl_Xg',
      'Jwt is expired',
    ],
  ])('throws an error on %s', async (token, message) => {
    const superSave = await getSuperSave();

    const { stop, verifyAccessToken } = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
    });

    authStop = stop;

    try {
      await verifyAccessToken(token);
      expect(false).toBeTruthy(); // We don't expect to end up here, an error should be thrown.
    } catch (error) {
      expect(error instanceof Error).toBeTruthy();
      expect((error as Error).message).toEqual(message);
    }
  });
});
