import { SuperSave } from 'supersave';
import { Request, Response } from 'express';
import Debug from 'debug';
import { getRefreshTokenRepository, getUserRepository } from '../../db';
import { RefreshTokenResponse, Config } from '../../types';
import { timeInSeconds } from '../../utils';
import { generateAccessToken } from '../../auth';

const debug = Debug('supersave:auth:refresh');

export const refresh = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    if (!req.body || !req.body.token) {
      res.status(400).json({ message: 'No token provided in request.' });
      return;
    }

    const { token }: { token: string } = req.body;

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const dbToken = await refreshTokenRepository.getById(token);

    if (!dbToken) {
      debug('Refresh token could not be found.');
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const now = timeInSeconds();
    if (dbToken.expiresAt < now) {
      debug('Used Refresh token for user %s is expired.', dbToken.userId);
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.getById(dbToken.userId);
    if (!user) {
      debug('User %s linked to refresh token was not found.', dbToken.userId);
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const accessToken = await generateAccessToken(config, user.id);

    user.lastLogin = timeInSeconds();
    debug('Updating user lastLogin timestamp %s.', user.lastLogin);
    await userRepository.update(user);

    const response: RefreshTokenResponse = {
      data: {
        success: true,
        accessToken,
      },
    };
    res.json(response);
  };
