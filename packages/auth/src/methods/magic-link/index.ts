/* eslint-disable @typescript-eslint/no-misused-promises */
import type { Router } from 'express';
import type { SuperSave } from 'supersave';
import { cleanUp } from './clean-up';
import { initializeDatabase } from './database';
import { magicLogin } from './http/routes/magic-login';
import { requestMagicLogin } from './http/routes/request-magic-login';
import { asyncCatch } from '../../http/utils';
import type { AuthMethodMagicLink, Config } from '../../types';

export async function initialize(
  superSave: SuperSave,
  config: Config,
  authConfig: AuthMethodMagicLink,
  router: Router
): Promise<() => void> {
  await initializeDatabase(superSave);

  router.post('/get-magic-login', asyncCatch(requestMagicLogin(superSave, config, authConfig)));
  router.post('/magic-login', asyncCatch(magicLogin(superSave, config)));

  return cleanUp(superSave);
}
