import type { Config } from '../../src/types';

const DEFAULT_CONFIG: Config = {
  tokenSecret: 'aaa',
  tokenAlgorithm: 'HS512',
  accessTokenExpiration: 300,
  refreshTokenExpiration: 3600 * 24 * 90, // 3 months,
  notSecuredEndpoints: [],
  securedEndpoints: [],
};

export function getConfig(config: Partial<Config> = {}): Config {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}
