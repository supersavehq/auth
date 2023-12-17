/** DB types are isolated here, so they don't get exported with the package. */

export type User = {
  id: string;
  name?: string | undefined;
  email: string;
  password: string;
  created: number;
  lastLogin: number;
};

export type RefreshToken = {
  id: string;
  userId: string;
  expiresAt: string;
  tokenHash: string;
  tokenSalt: string;
};
