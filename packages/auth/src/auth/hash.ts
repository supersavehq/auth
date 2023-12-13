// @ts-expect-error we have no types
import Pbkdf2 from 'nodejs-pbkdf2';

const CONFIG: Record<string, string | number> = {
  digestAlgorithm: 'sha512',
  keyLen: 64,
  saltSize: 64,
  iterations: 15_000,
};
const PBKDF2 = 'pbkdf2';

const pbkdf2 = new Pbkdf2(CONFIG);

export async function hash(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pbkdf2.hashPassword(input, (error: any, cipherText: string, salt: string) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${PBKDF2}$${CONFIG['iterations']}$${cipherText}$${salt}`);
    });
  });
}

export async function verify(input: string, hash: string): Promise<boolean> {
  const splitHash = hash.split('$');
  if (splitHash.length !== 4 || !splitHash[2] || !splitHash[3]) {
    throw new Error('Hash not formatted correctly');
  }

  if (splitHash[0] !== PBKDF2) {
    throw new Error('Unrecognized algorithm provided.');
  }

  return await pbkdf2.isValidPassword(input, splitHash[2], splitHash[3]);
}
