/* eslint-disable unicorn/consistent-destructuring */
import express from 'express';
import supertest from 'supertest';
import { superSaveAuth } from '../../../../../..';
import { getMagicLoginTokenRepository } from '../../../../../../src/methods/magic-link/database';
import { clear } from '../../../../../mysql';
import { getSuperSave } from '../../../../../utils/database';

/* supersave-auth uses a  timer to clean up records, so it must be explicitly stopped after each test. */
let authStop: () => void;

beforeEach(clear);
afterEach(() => {
  authStop();
});

describe('perform a magic login', () => {
  it('it fails on a missing identifier in the request', async () => {
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

    await supertest(app).post('/auth/magic-login').send({ foo: 'bar' }).expect(400);
    expect(sendMagicIdentifier).not.toBeCalled();
  });

  it('it fails on an invalid formatted identifier', async () => {
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

    await supertest(app).post('/auth/magic-login').send({ identifier: 'no-underscore' }).expect(400);
    expect(sendMagicIdentifier).not.toBeCalled();
  });

  it('it returns no success on not found identifier', async () => {
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

    const response = await supertest(app).post('/auth/magic-login').send({ identifier: 'linkid_foo-bar' }).expect(200);
    expect(response.body.data.authorized).toBe(false);
    expect(sendMagicIdentifier).not.toBeCalled();
  });

  it('it fails on an incorrect hash', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    let generatedIdentifier = '';

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [
        {
          type: 'magic-link',
          sendMagicIdentifier: (_user, identifier) => {
            generatedIdentifier = identifier;
          },
        },
      ],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // First, obtain a magic link identifier
    await supertest(app).post('/auth/get-magic-login').send({ email: 'user@example.com' }).expect(201);
    expect(generatedIdentifier).not.toBe('');

    const identifierParts = generatedIdentifier.split('_');

    // Now, update the salt
    const magicLinkRepository = getMagicLoginTokenRepository(superSave);
    const magicLink = await magicLinkRepository.getById(identifierParts[0] ?? '');
    expect(magicLink).toBeDefined();

    if (!magicLink) {
      // An explicit check here, so we can access magicLink here below.
      throw new Error('Magic link not found');
    }

    magicLink.identifierSalt = 'new-salt';
    await magicLinkRepository.update(magicLink);

    const response = await supertest(app)
      .post('/auth/magic-login')
      .send({ identifier: generatedIdentifier })
      .expect(200);
    expect(response.body.data.authorized).toBe(false);
    expect(response.body.data.accessToken).toBeUndefined();
    expect(response.body.data.refreshToken).toBeUndefined();
  });

  it('it fails on an expired identifier', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    let generatedIdentifier = '';

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [
        {
          type: 'magic-link',
          sendMagicIdentifier: (_user, identifier) => {
            generatedIdentifier = identifier;
          },
        },
      ],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // First, obtain a magic link identifier
    await supertest(app).post('/auth/get-magic-login').send({ email: 'user@example.com' }).expect(201);
    expect(generatedIdentifier).not.toBe('');

    const identifierParts = generatedIdentifier.split('_');

    // Now, expire the token
    const magicLinkRepository = getMagicLoginTokenRepository(superSave);
    const magicLink = await magicLinkRepository.getById(identifierParts[0] ?? '');
    expect(magicLink).toBeDefined();

    if (!magicLink) {
      // An explicit check here, so we can access magicLink here below.
      throw new Error('Magic link not found');
    }

    magicLink.expires = new Date('2000-01-01').toISOString();
    await magicLinkRepository.update(magicLink);

    const response = await supertest(app)
      .post('/auth/magic-login')
      .send({ identifier: generatedIdentifier })
      .expect(200);
    expect(response.body.data.authorized).toBe(false);
    expect(response.body.data.accessToken).toBeUndefined();
    expect(response.body.data.refreshToken).toBeUndefined();
  });

  it('it returns an accessToken and refreshToken on succesful login', async () => {
    const superSave = await getSuperSave();

    const app = express();
    app.use(express.json());

    let generatedIdentifier = '';

    const auth = await superSaveAuth(superSave, {
      tokenSecret: 'secure',
      methods: [
        {
          type: 'magic-link',
          sendMagicIdentifier: (_user, identifier) => {
            generatedIdentifier = identifier;
          },
        },
      ],
    });
    const { router } = auth;
    authStop = auth.stop;

    app.use('/auth', router);

    // First, obtain a magic link identifier
    await supertest(app).post('/auth/get-magic-login').send({ email: 'user@example.com' }).expect(201);
    expect(generatedIdentifier).not.toBe('');

    const response = await supertest(app)
      .post('/auth/magic-login')
      .send({ identifier: generatedIdentifier })
      .expect(200);
    expect(response.body.data.authorized).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();

    // Re use the identifier, it should be deleted after use.
    const secondResponse = await supertest(app)
      .post('/auth/magic-login')
      .send({ identifier: generatedIdentifier })
      .expect(200);
    expect(secondResponse.body.data.authorized).toBe(false);
    expect(secondResponse.body.data.accessToken).toBeUndefined();
    expect(secondResponse.body.data.refreshToken).toBeUndefined();
  });
});
