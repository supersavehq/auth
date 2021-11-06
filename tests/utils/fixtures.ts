import { User } from '../../src/types';

export function getUser(props: Partial<User> = {}): User {
  const now = Math.round(new Date().getTime() / 1000);

  return {
    id: 'user-id',
    name: 'Arthur Dent',
    email: 'user@example.com',
    password: 'pw-hash',
    created: now,
    lastLogin: now,
    ...props,
  };
}
