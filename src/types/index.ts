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

export type LoginResponse = {
  data: {
    authorized: boolean;
    accessToken?: string;
    refreshToken?: string;
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

export type RegistrationResponse = {
  data: {
    success: boolean;
    message?: string;
    accessToken?: string;
    refreshToken?: string;
  };
};

export type RefreshTokenResponse = {
  data: {
    success: boolean;
    accessToken?: string;
  };
};

export type Config = {
  tokenSecret: string;
  tokenAlgorithm: string;
  accessTokenExpiration: number;
  refreshTokenExpiration: number;
  notSecuredEndpoints: RegExp[];
  securedEndpoints: RegExp[];
};

export type ProvidedConfig = Partial<Config>;

export type CollectionEntityWithUserId = {
  id: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};
