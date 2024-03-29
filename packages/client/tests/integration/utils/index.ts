import { superSaveAuth } from '@supersave/auth';
import express from 'express';
import { EntityDefinition, SuperSave } from 'supersave';
import http from 'node:http';
export { requester } from './requester';

export const planetCollection: EntityDefinition = {
  name: 'planet',
  template: {
    name: '',
  },
  relations: [],
};

export async function getServer() {
  const superSave = await SuperSave.create('sqlite://:memory:');

  let resetToken = '';
  let magicLinkIdentifier = '';

  const app = express();
  app.use(express.json());
  const { router, addCollection, stop } = await superSaveAuth(superSave, {
    tokenSecret: 'unit-test-secret',
    methods: [
      {
        type: 'local-password',
        requestResetPassword: (_user, identifier) => {
          resetToken = identifier;
        },
      },
      {
        type: 'magic-login',
        sendMagicIdentifier(_user, identifier) {
          magicLinkIdentifier = identifier;
        },
      },
    ],
    rateLimit: false,
  });

  app.use('/auth', router);

  await addCollection(planetCollection);

  const server = http.createServer(app);
  const port = await new Promise((resolve) => {
    // @ts-expect-error The typings are not correct.
    server.listen(() => resolve(server.address().port));
  });

  return {
    prefix: `http://localhost:${port}/auth`,
    close: async () => {
      stop();
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
    getResetToken: () => resetToken,
    getMagicLinkIdentifier: () => magicLinkIdentifier,
  };
}
