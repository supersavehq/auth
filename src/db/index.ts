import { Repository, SuperSave } from 'supersave';
import { RefreshToken, User } from '../types';
import * as entities from './entities';

export async function initializeDb(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(entities.User);
  await superSave.addEntity(entities.RefreshToken);
}

export function getUserRepository(superSave: SuperSave): Repository<User> {
  return superSave.getRepository(entities.USER, entities.NAMESPACE);
}

export function getRefreshTokenRepository(
  superSave: SuperSave
): Repository<RefreshToken> {
  return superSave.getRepository(entities.REFRESH_TOKEN, entities.NAMESPACE);
}
