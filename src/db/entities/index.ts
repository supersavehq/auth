import type { EntityDefinition } from 'supersave';

export const NAMESPACE = 'auth';

export const USER = 'user';
export const REFRESH_TOKEN = 'refreshtoken';
export const RESET_PASSWORD_TOKEN = 'resettoken';

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
