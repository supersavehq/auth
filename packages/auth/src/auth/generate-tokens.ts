import type { SuperSave } from 'supersave';
import { generateAccessToken } from './generate-access-token';
import { randomBytes } from './utils';
import { getRefreshTokenRepository } from '../db';
import type { User } from '../types';
import type { Config, Tokens } from '../types';
import { timeInSeconds } from '../utils';

export async function generateTokens(superSave: SuperSave, config: Config, user: User): Promise<Tokens> {
  const bytes = await randomBytes();
  const refreshToken = bytes.toString('hex').slice(0, 32);
  const refreshTokenRepository = getRefreshTokenRepository(superSave);

  const expiresAt = timeInSeconds() + config.refreshTokenExpiration;
  await refreshTokenRepository.create({
    // @ts-expect-error we are providing an ID, superSave does an omit on that attribute.
    id: refreshToken,
    userId: user.id,
    expiresAt,
  });

  const accessToken = generateAccessToken(config, user.id);

  return {
    refreshToken,
    accessToken,
  };
}
