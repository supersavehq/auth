import { generateTokens } from '../../../src/auth';
import { getRefreshTokenRepository } from '../../../src/db';
import type { Config } from '../../../src/types';
import { clear } from '../../mysql';
import { getSuperSave } from '../../utils/database';
import { getUser } from '../../utils/fixtures';

beforeEach(clear);

describe('generateTokens', () => {
  it('generates tokens for a user', async () => {
    const superSave = await getSuperSave();

    const tokens = await generateTokens(
      superSave,
      { tokenSecret: 'aaa', tokenAlgorithm: 'HS512' } as Config,
      getUser()
    );

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const refreshTokens = await refreshTokenRepository.getAll();

    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0]?.id).toEqual(tokens.refreshToken);
  });
});
