import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateTokens, hash } from '../../auth';
import { checkPassword } from '../../auth';
import { getRefreshTokenRepository, getUserRepository } from '../../db';
import type { ChangePasswordResponseSuccess, Config } from '../../types';

const debug = Debug('supersave:auth:change-password');

export const changePassword = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    const passwordCheckResult = await checkPassword(superSave, req, res);
    if (typeof passwordCheckResult === 'undefined') {
      return; // checkPassword has already returned the error.
    }

    if (passwordCheckResult === false) {
      debug('Password validation check in change-password failed.');
      res.status(400).json({ message: 'Could not authorize user.' });
      return;
    }

    const user = passwordCheckResult;

    if (!req.body.newPassword) {
      res.status(400).json({
        message: 'Invalid request. No new password provided.',
      });
      return;
    }

    const { newPassword } = req.body;

    debug('Updating the password.');
    const userRepository = await getUserRepository(superSave);
    user.password = await hash.hash(newPassword);
    await userRepository.update(user);

    debug('Invalidating all refresh tokens.');
    const tokenRepository = await getRefreshTokenRepository(superSave);
    const existingTokens = await tokenRepository.getByQuery(
      tokenRepository.createQuery().eq('userId', user.id)
    );
    await Promise.all(
      existingTokens.map((token) => tokenRepository.deleteUsingId(token.id))
    );

    const tokens = await generateTokens(superSave, config, user);

    if (config.hooks?.changePassword) {
      config.hooks.changePassword(user);
    }

    const response: ChangePasswordResponseSuccess = {
      data: {
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
      },
    };
    res.json(response);
  };
