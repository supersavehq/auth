import type { User } from './db';
export { User } from './db';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = LoginResponseSuccess | LoginResponseFailure;
export type LoginResponseSuccess = {
  data: {
    authorized: true;
    accessToken: string;
    refreshToken: string;
  };
};
export type LoginResponseFailure = {
  data: {
    authorized: false;
    message?: string;
  };
};

export type ErrorResponse = {
  message: string;
};

export type RegistrationResponse =
  | RegistrationResponseSuccess
  | RegistrationResponseFailure;
export type RegistrationResponseSuccess = {
  data: {
    success: true;
    accessToken: string;
    refreshToken: string;
  };
};
export type RegistrationResponseFailure = {
  data: {
    success: false;
    message: string;
  };
};

export type RefreshTokenResponse =
  | RefreshTokenResponseSuccess
  | RefreshTokenResponseFailure;
export type RefreshTokenResponseSuccess = {
  data: {
    success: true;
    accessToken: string;
  };
};
export type RefreshTokenResponseFailure = {
  data: {
    success: false;
  };
};

export type Config<T extends User = User> = {
  tokenSecret: string;
  tokenAlgorithm: string;
  accessTokenExpiration: number;
  refreshTokenExpiration: number;
  resetPasswordTokenExpiration: number;
  notSecuredEndpoints: RegExp[];
  securedEndpoints: RegExp[];
  hooks?: {
    registration?: (user: T) => void | Promise<void>;
    login?: (user: T) => void | Promise<void>;
    refresh?: (user: T) => void | Promise<void>;
    changePassword?: (user: T) => void | Promise<void>;
    requestResetPassword?: (
      user: T,
      identifier: string
    ) => void | Promise<void>;
  };
};

export type ProvidedConfig = Partial<Config>;

export type CollectionEntityWithUserId = {
  id: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type ChangePasswordResponseSuccess = {
  data: {
    accessToken: string;
    refreshToken: string;
  };
};

export type RequestResetPasswordRequest = {
  email: string;
};
