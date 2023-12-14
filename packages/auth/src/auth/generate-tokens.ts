import { add } from 'date-fns';
import type { SuperSave } from 'supersave';
import { generateAccessToken } from './generate-access-token';
import { randomBytes, sha256 } from './utils';
import { getRefreshTokenRepository } from '../db';
import type { User } from '../types';
import type { Config, Tokens } from '../types';
import type { RefreshToken } from '../types/db';
import { timeInSeconds } from '../utils';

export const HASH_SEPARATOR = '_';
export const TOKEN_SEPARATOR = '_';

export async function generateTokens(
  superSave: SuperSave,
  config: Config,
  user: User,
  refreshTokenToReplace: RefreshToken | undefined
): Promise<Tokens> {
  const refreshTokenRepository = getRefreshTokenRepository(superSave);

  const longSalt = await randomBytes();
  const shortenedSalt = longSalt.toString('hex').slice(0, 32);
  const token = await randomBytes();
  const tokenHash = sha256(`${shortenedSalt}${HASH_SEPARATOR}${token.toString('hex')}`);

  const expiresAt = add(new Date(), { seconds: config.refreshTokenExpiration });

  // remove the old token
  if (refreshTokenToReplace) {
    await refreshTokenRepository.deleteUsingId(refreshTokenToReplace.id);
  }

  const databaseToken = await refreshTokenRepository.create({
    userId: user.id,
    expiresAt: timeInSeconds(expiresAt),
    tokenHash,
    tokenSalt: shortenedSalt,
  });
  const accessToken = generateAccessToken(config, user.id);

  return {
    refreshToken: `${databaseToken.id}${TOKEN_SEPARATOR}${token.toString('hex')}`,
    accessToken,
  };
}
