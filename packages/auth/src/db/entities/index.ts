import type { EntityDefinition } from 'supersave';

export const NAMESPACE = 'auth';

export const USER = 'user';
export const REFRESH_TOKEN = 'refreshtoken';

export const User: EntityDefinition = {
  name: USER,
  namespace: NAMESPACE,
  template: {},
  relations: [],
  filterSortFields: {
    email: 'string',
  },
};

export const RefreshToken: EntityDefinition = {
  name: REFRESH_TOKEN,
  namespace: NAMESPACE,
  template: {},
  relations: [],
  filterSortFields: {
    userId: 'string',
  },
};
