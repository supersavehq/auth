import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { checkPassword, generateTokens } from '../../../../auth';
import { getUserRepository } from '../../../../db';
import type { Config } from '../../../../types';
import { timeInSeconds } from '../../../../utils';
import type { LoginResponse } from '../../types';

const debug = Debug('supersave:auth:login');

export const login = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    const passwordCheckResult = await checkPassword(superSave, req, res);
    if (passwordCheckResult === undefined) {
      return; // checkPassword has already returned the error.
    }

    if (passwordCheckResult === false) {
      const response: LoginResponse = { data: { authorized: false } };
      res.json(response);
      return;
    }

    const user = passwordCheckResult;
    // eslint-disable-next-line unicorn/no-useless-undefined
    const tokens = await generateTokens(superSave, config, user, undefined);

    const repository = getUserRepository(superSave);
    user.lastLogin = timeInSeconds();
    debug('Updating user %s lastLogin timestamp %s.', user.id, user.lastLogin);
    await repository.update(user);

    if (config.hooks?.login) {
      void config.hooks.login(user);
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
