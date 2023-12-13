import nJwt from 'njwt';
import type { Config } from '../types';

export function generateAccessToken(config: Config, sub: string): string {
  const jwt = nJwt.create({ sub }, config.tokenSecret, config.tokenAlgorithm);
  jwt.setExpiration(Date.now() + config.accessTokenExpiration * 1000);
  return jwt.compact();
}
