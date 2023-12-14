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
  expiresAt: number;
  tokenHash: string;
  tokenSalt: string;
};

export type ResetPasswordToken = {
  id: string;
  identifier: string;
  expires: number;
  userId: string;
};
