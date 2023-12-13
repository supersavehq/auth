import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateAccessToken } from '../../auth';
import { getRefreshTokenRepository, getUserRepository } from '../../db';
import type { Config, RefreshTokenResponse } from '../../types';
import { timeInSeconds } from '../../utils';

const debug = Debug('supersave:auth:refresh');

export const refresh = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    if (!req.body || !req.body.token) {
      res.status(400).json({ message: 'No token provided in request.' });
      return;
    }

    const { token }: { token: string } = req.body;

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const databaseToken = await refreshTokenRepository.getById(token);

    if (!databaseToken) {
      debug('Refresh token could not be found.');
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const now = timeInSeconds();
    if (databaseToken.expiresAt < now) {
      debug('Used Refresh token for user %s is expired.', databaseToken.userId);
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.getById(databaseToken.userId);
    if (!user) {
      debug('User %s linked to refresh token was not found.', databaseToken.userId);
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const accessToken = generateAccessToken(config, user.id);

    user.lastLogin = timeInSeconds();
    debug('Updating user lastLogin timestamp %s.', user.lastLogin);
    await userRepository.update(user);

    if (config.hooks?.refresh) {
      void config.hooks.refresh(user);
    }

    const response: RefreshTokenResponse = {
      data: {
        success: true,
        accessToken,
      },
    };
    res.json(response);
  };
