import type { SuperSave } from 'supersave';
import { getResetPasswordTokenRepository } from '../db';
import { timeInSeconds } from '../utils';

export function cleanUp(superSave: SuperSave) {
  const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);

  // Invalidate any expired password reset tokens.
  const interval = setInterval(() => {
    const now = timeInSeconds();
    void resetPasswordTokenRepository
      .getByQuery(resetPasswordTokenRepository.createQuery().lt('expires', now))
      .then((tokens) => {
        return Promise.all(tokens.map((token) => resetPasswordTokenRepository.deleteUsingId(token.id)));
      });
  }, 60_000);
  interval.unref();

  return () => {
    clearInterval(interval);
  };
}
