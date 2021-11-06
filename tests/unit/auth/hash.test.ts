import { hash, verify } from '../../../src/auth/hash';

const INPUT = 'hash-input';

describe('hash', () => {
  it('salts the hashes.', async () => {
    const hashValue1 = await hash(INPUT);
    const hashValue2 = await hash(INPUT);

    expect(hashValue1).not.toEqual(hashValue2);
  });
});

describe('verify', () => {
  it('return true for verifying a hash with its input', async () => {
    const hashedValue = await hash(INPUT);

    expect(await verify(INPUT, hashedValue)).toBe(true);
  });

  it('rejects verification for a hash with different input', async () => {
    const hashedValue = await hash(INPUT);

    expect(await verify('not-valid-text', hashedValue)).toBe(false);
  });
});
