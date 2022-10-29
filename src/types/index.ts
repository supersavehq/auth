export type User = {
  id: string;
  name?: string | undefined;
  email: string;
  password: string;
  created: number;
  lastLogin: number;
};

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

export type RefreshToken = {
  id: string;
  userId: string;
  expiresAt: number;
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

export type Config = {
  tokenSecret: string;
  tokenAlgorithm: string;
  accessTokenExpiration: number;
  refreshTokenExpiration: number;
  notSecuredEndpoints: RegExp[];
  securedEndpoints: RegExp[];
  hooks?: {
    registration?: <T extends User = User>(user: T) => void | Promise<void>;
    login?: <T extends User = User>(user: T) => void | Promise<void>;
    refresh?: <T extends User = User>(user: T) => void | Promise<void>;
    changePassword?: <T extends User = User>(user: T) => void | Promise<void>;
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
