import { generateAccessToken, generateTokens } from '../../../src/auth';
import { getRefreshTokenRepository } from '../../../src/db';
import type { Config } from '../../../src/types';
import { clear } from '../../mysql';
import { getSuperSave } from '../../utils/database';
import { getUser } from '../../utils/fixtures';

beforeEach(clear);

jest.mock('../../../src/auth/generate-access-token');

describe('generateTokens', () => {
  it('generates tokens for a user', async () => {
    const superSave = await getSuperSave();

    const config: Config = {
      tokenSecret: 'aaa',
      tokenAlgorithm: 'HS512',
      accessTokenExpiration: 1,
      refreshTokenExpiration: 1,
      notSecuredEndpoints: [],
      securedEndpoints: [],
      methods: [{ type: 'local-password', requestResetPassword: () => {} }],
      rateLimit: false,
    };

    const tokens = await generateTokens(
      superSave,
      config,
      getUser(),
      // eslint-disable-next-line unicorn/no-useless-undefined
      undefined
    );
    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const refreshTokens = await refreshTokenRepository.getAll();

    expect(refreshTokens).toHaveLength(1);
    const parts = tokens.refreshToken.split('_');
    expect(parts).toHaveLength(2);
    expect(refreshTokens[0]?.id).toEqual(parts[0]);
    expect(generateAccessToken).toHaveBeenCalledWith(config, getUser().id);
  });
});
