import { randomBytes } from './utils';

export * as hash from './hash';
export { generateTokens } from './generate-tokens';
export { generateAccessToken } from './generate-access-token';
export { verifyAccessToken } from './verify-access-token';
export { checkPassword } from './check-password';

export async function generateUniqueIdentifier(): Promise<string> {
  return (await randomBytes()).toString('hex').slice(0, 32);
}
