import type { Repository, SuperSave } from 'supersave';
import * as entities from './entities';
import type { RefreshToken, ResetPasswordToken, User } from '../types/db';

export async function initializeDatabase(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(entities.User);
  await superSave.addEntity(entities.RefreshToken);
  await superSave.addEntity(entities.ResetPasswordToken);
}

export function getUserRepository(superSave: SuperSave): Repository<User> {
  return superSave.getRepository(entities.USER, entities.NAMESPACE);
}

export function getRefreshTokenRepository(superSave: SuperSave): Repository<RefreshToken> {
  return superSave.getRepository(entities.REFRESH_TOKEN, entities.NAMESPACE);
}

export function getResetPasswordTokenRepository(superSave: SuperSave): Repository<ResetPasswordToken> {
  return superSave.getRepository(entities.RESET_PASSWORD_TOKEN, entities.NAMESPACE);
}
