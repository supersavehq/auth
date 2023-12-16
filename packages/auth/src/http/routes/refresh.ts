import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateTokens } from '../../auth';
import { HASH_SEPARATOR, TOKEN_SEPARATOR } from '../../auth/generate-tokens';
import { sha256 } from '../../auth/utils';
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

    // The token consists of 2 parts: [id].[token]. We use the id to find the refresh token in the database.
    const tokenParts = token.split(TOKEN_SEPARATOR);
    if (tokenParts.length !== 2) {
      debug('The provided token is invalid, it did not split into 2 parts.');
      res.status(400).json({ message: 'Invalid token provided in request.' });
      return;
    }

    const [tokenId, tokenValue] = tokenParts;

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const databaseToken = await refreshTokenRepository.getById(tokenId ?? '');

    if (!databaseToken) {
      debug('Refresh token could not be found.');
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    // Validate the hash
    const tokenHash = sha256(`${databaseToken.tokenSalt}${HASH_SEPARATOR}${tokenValue}`);
    if (tokenHash !== databaseToken.tokenHash) {
      debug('Refresh token hash does not match. %s !== %s', tokenHash, databaseToken.tokenHash);
      const response: RefreshTokenResponse = { data: { success: false } };
      res.status(401).json(response);
      return;
    }

    const now = new Date();
    if (databaseToken.expiresAt < now.toISOString()) {
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

    const { accessToken, refreshToken } = await generateTokens(superSave, config, user, databaseToken);

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
        refreshToken,
      },
    };
    res.json(response);
  };
