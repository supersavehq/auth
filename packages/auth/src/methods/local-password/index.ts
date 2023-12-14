/* eslint-disable @typescript-eslint/no-misused-promises */
import type { Router } from 'express';
import type { SuperSave } from 'supersave';
import { cleanUp } from './clean-up';
import { initializeDatabase } from './database';
import { changePassword } from './http/routes/change-password';
import { doResetPassword } from './http/routes/do-reset-password';
import { login } from './http/routes/login';
import { register } from './http/routes/register';
import { requestResetPassword } from './http/routes/request-reset-password';
import { authenticate } from '../../http/middleware';
import { asyncCatch } from '../../http/utils';
import type { AuthMethodLocalPassword, Config } from '../../types';

const DEFAULT_RESET_PASSWORD_EXPIRATION = 3600;

export async function initialize(
  superSave: SuperSave,
  config: Config,
  authConfig: AuthMethodLocalPassword,
  router: Router
): Promise<() => void> {
  await initializeDatabase(superSave);

  router.post('/login', asyncCatch(login(superSave, config)));
  router.post('/register', asyncCatch(register(superSave, config)));
  router.post('/change-password', authenticate(config), asyncCatch(changePassword(superSave, config)));
  router.post(
    '/reset-password',
    asyncCatch(
      requestResetPassword(
        superSave,
        config,
        authConfig.resetPasswordTokenExpiration ?? DEFAULT_RESET_PASSWORD_EXPIRATION,
        authConfig.requestResetPassword
      )
    )
  );
  router.post('/do-reset-password', asyncCatch(doResetPassword(superSave, config)));

  return cleanUp(superSave);
}
