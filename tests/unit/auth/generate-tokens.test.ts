import { getSuperSave } from '../../utils/db';
import { generateTokens } from '../../../src/auth';
import { getUser } from '../../utils/fixtures';
import { getRefreshTokenRepository } from '../../../src/db';

describe('generateTokens', () => {
  it('generates tokens for a user', async () => {
    const superSave = await getSuperSave();

    const tokens = await generateTokens(superSave, getUser());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const refreshTokens = await refreshTokenRepository.getAll();

    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0].id).toEqual(tokens.refreshToken);
  });
});
