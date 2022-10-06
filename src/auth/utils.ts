import crypto from 'node:crypto';

export async function randomBytes(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, function (error, randomBytes) {
      if (error) {
        reject(error);
      }

      resolve(randomBytes);
    });
  });
}
