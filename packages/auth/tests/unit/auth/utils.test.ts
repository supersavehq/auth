import { randomBytes } from '../../../src/auth/utils';

describe('randomBytes', () => {
  it('generates a different value everytime', async () => {
    const first = await randomBytes();
    const second = await randomBytes();

    expect(first.toString('hex')).not.toEqual(second.toString('hex'));
  });
});
