/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { Config, superSaveAuth } from '../../../..';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { clear } from '../../../mysql';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  jest.useRealTimers();
  authStop();
});

describe('authenticate', () => {
  it('successfully validated a valid token', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/auth', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send(res.locals['auth'].userId));

    // First get a valid token
    const passwordHash = await hash('password');
    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(getUser({ password: passwordHash }));

    const request = { email: user.email, password: 'password' };
    const loginResponse = await supertest(app).post('/auth/login').send(request).expect(200);

    const accessToken = loginResponse.body.data.accessToken;
    const response = await supertest(app).get('/hello').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(response.text).toEqual(user.id);
  });

  it('rejects a request with no token.', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());
    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/auth', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send(res.locals['auth'].userId));

    await supertest(app).get('/hello').expect(401);
  });

  it('rejects an outdated token.', async () => {
    // Set time in the past to generate an old token
    const now = Date.now();
    jest.useFakeTimers().setSystemTime(new Date('2020-01-01').getTime());

    // initialize
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/auth', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send(res.locals['auth'].userId));

    // First get a valid token
    const passwordHash = await hash('password');
    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(getUser({ password: passwordHash }));

    const request = { email: user.email, password: 'password' };
    const loginResponse = await supertest(app).post('/auth/login').send(request).expect(200);

    const accessToken = loginResponse.body.data.accessToken;

    // restore the time to now
    jest.setSystemTime(now);

    await supertest(app).get('/hello').set('Authorization', `Bearer ${accessToken}`).expect(401);
  });
});

describe('it allows not secured endpoints', () => {
  const config: Partial<Config> = {
    tokenSecret: 'secure',
    methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    notSecuredEndpoints: [/^\/hello/],
  };

  it('allows a request with no token on the allowed endpoint', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, config);
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send('hi there!'));

    await supertest(app).get('/hello').expect(200);
  });

  it('blocks requests on not configured endpoints', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    });
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send('hi there!'));
    app.get('/other-endpoint', middleware.authenticate, (_req, res) => res.send('Will never see this.'));

    await supertest(app).get('/other-endpoint').expect(401);
  });
});

describe('it only secures configured endpoints', () => {
  const config: Partial<Config> = {
    tokenSecret: 'secure',
    methods: [{ type: 'local-password', requestResetPassword: () => {} }],
    securedEndpoints: [/^\/auth\/.*/],
  };

  it('allows a request with no token end the allowed endpoint', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, config);
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/', middleware.authenticate, router);
    app.get('/hello', (_req, res) => res.send('hi there!'));

    await supertest(app).get('/hello').expect(200);
  });

  it('blocks requests on not configured endpoints', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    const auth = await superSaveAuth(superSave, config);
    const { router, middleware } = auth;
    authStop = auth.stop;

    app.use('/', router);
    app.get('/hello', middleware.authenticate, (_req, res) => res.send('hi there!'));
    app.get('/auth/other-endpoint', middleware.authenticate, (_req, res) => res.send('Will never see this.'));

    await supertest(app).get('/auth/other-endpoint').expect(401);
  });
});
