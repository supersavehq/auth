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

  const app = express();
  app.use(express.json());
  const { router, addCollection, stop } = await superSaveAuth(superSave, {
    tokenSecret: 'unit-test-secret',
    accessTokenExpiration: 300,
    hooks: {
      requestResetPassword: (_user, identifier) => {
        resetToken = identifier;
      },
    },
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
  };
}
