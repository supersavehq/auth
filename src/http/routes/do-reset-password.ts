import type { Request, Response } from 'express';
import Debug from 'debug';
import {
  getRefreshTokenRepository,
  getResetPasswordTokenRepository,
  getUserRepository,
} from '../../db';
import type { Config, DoResetPasswordResponse } from '../../types';
import type { SuperSave } from 'supersave';
import { generateTokens, hash } from '../../auth';
import { timeInSeconds } from '../../utils';

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

    const resetPasswordTokenRepository = await getResetPasswordTokenRepository(
      superSave
    );
    const dbResetToken = await resetPasswordTokenRepository.getOneByQuery(
      resetPasswordTokenRepository.createQuery().eq('identifier', token)
    );

    if (
      dbResetToken === null ||
      dbResetToken.expires < Math.floor(Date.now() / 1000)
    ) {
      debug(
        'Reset token not found in the database, or it has already expired.'
      );
      const response: DoResetPasswordResponse = {
        data: {
          success: false,
          reason: 'INVALID_TOKEN',
        },
      };
      res.json(response);
      return;
    }

    const userRepository = await getUserRepository(superSave);
    const user = await userRepository.getById(dbResetToken.userId);
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
    await resetPasswordTokenRepository.deleteUsingId(dbResetToken.id);

    debug('Invalidating all refresh tokens.');
    const tokenRepository = await getRefreshTokenRepository(superSave);
    const existingTokens = await tokenRepository.getByQuery(
      tokenRepository.createQuery().eq('userId', user.id)
    );
    await Promise.all(
      existingTokens.map((token) => tokenRepository.deleteUsingId(token.id))
    );

    const tokens = await generateTokens(superSave, config, user);

    if (config.hooks?.doResetPassword) {
      config.hooks.doResetPassword(user);
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
