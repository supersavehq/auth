import type { Repository, SuperSave } from 'supersave';
import * as entities from './entities';
import type { RefreshToken, User } from '../types/db';

export async function initializeDatabase(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(entities.User);
  await superSave.addEntity(entities.RefreshToken);
}

export function getUserRepository(superSave: SuperSave): Repository<User> {
  return superSave.getRepository(entities.USER, entities.NAMESPACE);
}

export function getRefreshTokenRepository(superSave: SuperSave): Repository<RefreshToken> {
  return superSave.getRepository(entities.REFRESH_TOKEN, entities.NAMESPACE);
}
