import type { SuperSave } from 'supersave';
import express, { RequestHandler, Request, Response } from 'express';
import {
  login,
  register,
  refresh,
  changePassword,
  requestResetPassword,
} from './http/routes';
import { initializeDb } from './db';
import type { Config, ProvidedConfig } from './types';
import { authenticate } from './http/middleware';
import { addCollection } from './hooks';

// Makes sure that we can catch an async exception in express.
function asyncCatch(middleware: RequestHandler) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: Request, res: Response, next: any) =>
    Promise.resolve(middleware(req, res, next)).catch(next);
}

const DEFAULT_CONFIG: Config = {
  tokenSecret: '',
  tokenAlgorithm: 'HS512',
  accessTokenExpiration: 300,
  refreshTokenExpiration: 3600 * 24 * 90, // 3 months,
  resetPasswordTokenExpiration: 3600, // 1 hour
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
  router.post('/login', asyncCatch(login(superSave, config)));
  router.post('/register', asyncCatch(register(superSave, config)));
  router.post('/refresh', asyncCatch(refresh(superSave, config)));
  router.post(
    '/change-password',
    authenticate(config),
    asyncCatch(changePassword(superSave, config))
  );
  router.post(
    '/reset-password',
    asyncCatch(requestResetPassword(superSave, config))
  );

  return {
    router,
    middleware: {
      authenticate: authenticate(config),
    },
    addCollection: addCollection(superSave),
  };
}
