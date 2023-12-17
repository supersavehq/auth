import type { User } from '../../types';

export type MagicLoginToken = {
  id: string;
  user: User;
  expires: string;
  identifierHash: string;
  identifierSalt: string;
};

export type RequestMagicLoginRequest = {
  email: string;
};
export type MagicLoginRequest = {
  identifier: string;
};

export type MagicLoginResponse = MagicLoginResponseSuccess | MagicLoginResponseFailure;
export type MagicLoginResponseSuccess = {
  data: {
    authorized: true;
    accessToken: string;
    refreshToken: string;
  };
};
export type MagicLoginResponseFailure = {
  data: {
    authorized: false;
    message?: string;
  };
};
