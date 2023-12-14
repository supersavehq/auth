import type { EntityDefinition, Repository, SuperSave } from 'supersave';
import { NAMESPACE } from '../../../db/entities';
import type { ResetPasswordToken as ResetPasswordTokenType } from '../types';

export const RESET_PASSWORD_TOKEN = 'resettoken';

export const ResetPasswordToken: EntityDefinition = {
  name: RESET_PASSWORD_TOKEN,
  namespace: NAMESPACE,
  template: {},
  relations: [],
  filterSortFields: {
    identifier: 'string',
    expires: 'number',
    userId: 'string',
  },
};

export async function initializeDatabase(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(ResetPasswordToken);
}

export function getResetPasswordTokenRepository(superSave: SuperSave): Repository<ResetPasswordTokenType> {
  return superSave.getRepository(RESET_PASSWORD_TOKEN, NAMESPACE);
}
