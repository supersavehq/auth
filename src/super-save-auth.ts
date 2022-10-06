import type { SuperSave } from 'supersave';
import express from 'express';
import { login, register, refresh } from './http/routes';
import { initializeDb } from './db';
import type { Config, ProvidedConfig } from './types';
import { authenticate } from './http/middleware';
import { addCollection } from './hooks';

const DEFAULT_CONFIG: Config = {
  tokenSecret: '',
  tokenAlgorithm: 'HS512',
  accessTokenExpiration: 300,
  refreshTokenExpiration: 3600 * 24 * 90, // 3 months,
  notSecuredEndpoints: [],
  securedEndpoints: [],
};

export async function superSaveAuth(
  superSave: SuperSave,
  providedConfig: ProvidedConfig = {}
) {
  if (!providedConfig.tokenSecret) {
    throw new Error('No token secret is defined.');
  }
  if (providedConfig.notSecuredEndpoints && providedConfig.securedEndpoints) {
    throw new Error(
      'notSecuredEnpoints and securedEndpoints are mutually exclusive, you can only define one.'
    );
  }

  const config: Config = {
    ...DEFAULT_CONFIG,
    ...providedConfig,
  };

  await initializeDb(superSave);

  const router = express.Router();
  router.post('/login', login(superSave, config));
  router.post('/register', register(superSave, config));
  router.post('/refresh', refresh(superSave, config));

  return {
    router,
    middleware: {
      authenticate: authenticate(config),
    },
    addCollection: addCollection(superSave),
  };
}
