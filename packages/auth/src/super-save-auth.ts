/* eslint-disable @typescript-eslint/no-misused-promises */
import express from 'express';
import type { SuperSave } from 'supersave';
import { verifyAccessToken } from './auth';
import { initializeDatabase as initializeDatabase } from './db';
import { addCollection } from './hooks';
import { authenticate } from './http/middleware';
import { refresh } from './http/routes/refresh';
import { asyncCatch } from './http/utils';
import { initialize as initializeMethods } from './methods';
import type { Config } from './types';

const DEFAULT_CONFIG: Config = {
  tokenSecret: '',
  tokenAlgorithm: 'HS512',
  accessTokenExpiration: 300,
  refreshTokenExpiration: 3600 * 24 * 90, // 3 months,
  notSecuredEndpoints: [],
  securedEndpoints: [],
  methods: [],
};

export async function superSaveAuth(superSave: SuperSave, providedConfig: Partial<Config> = {}) {
  if (!providedConfig.tokenSecret) {
    throw new Error('No token secret is defined.');
  }
  if (providedConfig.notSecuredEndpoints && providedConfig.securedEndpoints) {
    throw new Error('notSecuredEnpoints and securedEndpoints are mutually exclusive, you can only define one.');
  }
  if (!providedConfig.methods || providedConfig.methods.length === 0) {
    throw new Error('There are no authentication methods defined. Provide at least one methods in config.methods.');
  }

  const config: Config = {
    ...DEFAULT_CONFIG,
    ...providedConfig,
  };

  await initializeDatabase(superSave);

  const router = express.Router();
  router.post('/refresh', asyncCatch(refresh(superSave, config)));

  const cleanUps = await initializeMethods(superSave, config, router);

  return {
    router,
    middleware: {
      authenticate: authenticate(config),
    },
    verifyAccessToken: (token: string) => {
      const parsedToken = verifyAccessToken(config, token);
      // @ts-expect-error Types are incorrect, there is a property sub in the parsedTokens' body.
      return parsedToken.body.sub;
    },
    addCollection: addCollection(superSave),
    stop: () => {
      for (const cleanUp of cleanUps) {
        cleanUp();
      }
    },
  };
}
