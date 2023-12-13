import type { User } from '../../src/types';

export function getUser(properties: Partial<User> = {}): User {
  const now = Math.round(Date.now() / 1000);

  return {
    id: 'user-id',
    name: 'Arthur Dent',
    email: 'user@example.com',
    password: 'pw-hash',
    created: now,
    lastLogin: now,
    ...properties,
  };
}
