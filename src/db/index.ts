import type { Repository, SuperSave } from 'supersave';
import type { RefreshToken, User, ResetPasswordToken } from '../types/db';
import * as entities from './entities';

export async function initializeDb(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(entities.User);
  await superSave.addEntity(entities.RefreshToken);
  await superSave.addEntity(entities.ResetPasswordToken);
}

export function getUserRepository(superSave: SuperSave): Repository<User> {
  return superSave.getRepository(entities.USER, entities.NAMESPACE);
}

export function getRefreshTokenRepository(
  superSave: SuperSave
): Repository<RefreshToken> {
  return superSave.getRepository(entities.REFRESH_TOKEN, entities.NAMESPACE);
}

export function getResetPasswordTokenRepository(
  superSave: SuperSave
): Repository<ResetPasswordToken> {
  return superSave.getRepository(
    entities.RESET_PASSWORD_TOKEN,
    entities.NAMESPACE
  );
}
