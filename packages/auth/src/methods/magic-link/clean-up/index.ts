import type { SuperSave } from 'supersave';
import { getMagicLoginTokenRepository } from '../database';

export function cleanUp(superSave: SuperSave) {
  const magicLoginTokenRepository = getMagicLoginTokenRepository(superSave);

  // Invalidate any expired login tokens
  const interval = setInterval(() => {
    const now = new Date().toISOString();
    void magicLoginTokenRepository
      .getByQuery(magicLoginTokenRepository.createQuery().lt('expires', now))
      .then((tokens) => {
        return Promise.all(tokens.map((token) => magicLoginTokenRepository.deleteUsingId(token.id)));
      });
  }, 60_000);
  interval.unref();

  return () => {
    clearInterval(interval);
  };
}
