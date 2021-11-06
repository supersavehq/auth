import nJwt from 'njwt';
import { SuperSave } from 'supersave';
import { getRefreshTokenRepository } from '../db';
import { User } from '../types';
import { Tokens } from './types';
import { randomBytes } from './utils';

async function generateAccessToken(sub: string): Promise<string> {
  // TODO secret from config, and expiration
  const jwt = nJwt.create({ sub }, 'aaa', 'HS512');
  jwt.setExpiration(new Date().getTime() + 60 * 60 * 1000); // One hour from now
  return jwt.compact();
}

export async function generateTokens(
  superSave: SuperSave,
  user: User
): Promise<Tokens> {
  const refreshToken = (await randomBytes()).toString('hex');

  const refreshTokenRepository = getRefreshTokenRepository(superSave);

  // TODO get this from config
  const expiresAt = Math.round(new Date().getTime() / 1000) * 86400;
  await refreshTokenRepository.create({
    // @ts-expect-error we are providing an ID, superSave does an omit on that attribute.
    id: refreshToken,
    userId: user.id,
    expiresAt,
  });

  const accessToken = await generateAccessToken(user.id);

  return {
    refreshToken,
    accessToken,
  };
}
