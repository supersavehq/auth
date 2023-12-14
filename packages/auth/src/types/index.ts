import type { User } from './db';
export { User } from './db';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type ErrorResponse = {
  message: string;
};

export type RefreshTokenResponse = RefreshTokenResponseSuccess | RefreshTokenResponseFailure;
export type RefreshTokenResponseSuccess = {
  data: {
    success: true;
    accessToken: string;
    refreshToken: string;
  };
};
export type RefreshTokenResponseFailure = {
  data: {
    success: false;
  };
};

export type AuthMethod = AuthMethodLocalPassword | AuthMethodMagicLink;
export type AuthMethodLocalPassword = {
  type: 'local-password';
  resetPasswordTokenExpiration?: number;
  requestResetPassword: (user: User, identifier: string) => Promise<void> | void;
};

export type AuthMethodMagicLink = {
  type: 'magic-link';
  sendLink: (user: User, token: string) => Promise<void>;
};

export type Config<T extends User = User> = {
  tokenSecret: string;
  tokenAlgorithm: string;
  accessTokenExpiration: number;
  refreshTokenExpiration: number;
  notSecuredEndpoints: RegExp[];
  securedEndpoints: RegExp[];
  hooks?: {
    registration?: (user: T) => void | Promise<void>;
    login?: (user: T) => void | Promise<void>;
    refresh?: (user: T) => void | Promise<void>;
    changePassword?: (user: T) => void | Promise<void>;
    requestResetPassword?: (user: T, identifier: string) => void | Promise<void>;
    doResetPassword?: (user: T) => void | Promise<void>;
  };
  methods: AuthMethod[];
};

export type CollectionEntityWithUserId = {
  id: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};
