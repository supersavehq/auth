import type { Request, Response } from 'express';
import Debug from 'debug';
import { getUserRepository } from '../../db';
import type { LoginResponse, Config } from '../../types';
import { generateTokens } from '../../auth';
import type { SuperSave } from 'supersave';
import { timeInSeconds } from '../../utils';
import { checkPassword } from '../../auth';

const debug = Debug('supersave:auth:login');

export const login = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    const passwordCheckResult = await checkPassword(superSave, req, res);
    if (typeof passwordCheckResult === 'undefined') {
      return; // checkPassword has already returned the error.
    }

    if (passwordCheckResult === false) {
      const response: LoginResponse = { data: { authorized: false } };
      res.json(response);
      return;
    }

    const user = passwordCheckResult;
    const tokens = await generateTokens(superSave, config, user);

    const repository = getUserRepository(superSave);
    user.lastLogin = timeInSeconds();
    debug('Updating user %s lastLogin timestamp %s.', user.id, user.lastLogin);
    await repository.update(user);

    if (config.hooks?.login) {
      config.hooks.login(user);
    }

    const response: LoginResponse = {
      data: {
        authorized: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
    res.json(response);
  };
