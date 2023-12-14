import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateTokens, hash } from '../../../../auth';
import { getRefreshTokenRepository, getUserRepository } from '../../../../db';
import type { Config } from '../../../../types';
import { timeInSeconds } from '../../../../utils';
import { getResetPasswordTokenRepository } from '../../database';
import type { DoResetPasswordResponse } from '../../types';

const debug = Debug('supersave:auth:do-reset-password');

export const doResetPassword = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    if (!req.body.password || !req.body.token) {
      debug('No password or token field found in request body.');
      res.status(400).json({
        message: 'Invalid request. No password or token field provided.',
      });
      return;
    }
    const { password, token } = req.body;

    const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);
    const databaseResetToken = await resetPasswordTokenRepository.getOneByQuery(
      resetPasswordTokenRepository.createQuery().eq('identifier', token)
    );

    if (databaseResetToken === null || databaseResetToken.expires < Math.floor(Date.now() / 1000)) {
      debug('Reset token not found in the database, or it has already expired.');
      const response: DoResetPasswordResponse = {
        data: {
          success: false,
          reason: 'INVALID_TOKEN',
        },
      };
      res.json(response);
      return;
    }

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.getById(databaseResetToken.userId);
    if (user === null) {
      debug('Could not find user linked to reset token.');
      res.status(500).send();
      return;
    }

    debug('Updating the password.');
    user.password = await hash.hash(password);
    user.lastLogin = timeInSeconds();
    await userRepository.update(user);

    debug('Removing reset token.');
    await resetPasswordTokenRepository.deleteUsingId(databaseResetToken.id);

    debug('Invalidating all refresh tokens.');
    const tokenRepository = getRefreshTokenRepository(superSave);
    const existingTokens = await tokenRepository.getByQuery(tokenRepository.createQuery().eq('userId', user.id));
    await Promise.all(existingTokens.map((token) => tokenRepository.deleteUsingId(token.id)));

    // eslint-disable-next-line unicorn/no-useless-undefined
    const tokens = await generateTokens(superSave, config, user, undefined);

    if (config.hooks?.doResetPassword) {
      void config.hooks.doResetPassword(user);
    }

    const response: DoResetPasswordResponse = {
      data: {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
    res.json(response);
  };
