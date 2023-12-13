import nJwt from 'njwt';
import type { Config } from '../types';

export function verifyAccessToken(config: Config, token: string): nJwt.Jwt {
  const jwtToken = new nJwt.Verifier()
    .setSigningAlgorithm(config.tokenAlgorithm)
    .setSigningKey(config.tokenSecret)
    .verify(token);
  return jwtToken;
}
