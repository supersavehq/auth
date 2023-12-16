import type { EntityDefinition, Repository, SuperSave } from 'supersave';
import { NAMESPACE, USER } from '../../../db/entities';
import type { MagicLoginToken as MagicLoginTokenType } from '../types';

export const MAGIC_LOGIN_TOKEN = 'magiclogintoken';

export const MagicLoginToken: EntityDefinition = {
  name: MAGIC_LOGIN_TOKEN,
  namespace: NAMESPACE,
  template: {},
  relations: [
    {
      name: USER,
      namespace: NAMESPACE,
      field: 'user',
      multiple: false,
    },
  ],
  filterSortFields: {
    expires: 'string',
  },
};

export async function initializeDatabase(superSave: SuperSave): Promise<void> {
  await superSave.addEntity(MagicLoginToken);
}

export function getMagicLoginTokenRepository(superSave: SuperSave): Repository<MagicLoginTokenType> {
  return superSave.getRepository(MAGIC_LOGIN_TOKEN, NAMESPACE);
}
