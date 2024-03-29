import type { SuperSave } from 'supersave';
import { timeInSeconds } from '../../../utils';
import { getResetPasswordTokenRepository } from '../database';

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
