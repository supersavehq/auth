export type HttpResponse<T> = {
  statusCode: number;
  data: T;
};

export interface Requester {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T, D = any>(url: string, data?: D | undefined, headers?: Record<string, string>) => Promise<HttpResponse<T>>;
}

export type Options = {
  baseUrl: string;
  requester?: Requester;
};

export type Client = {
  login: (request: LoginRequest) => Promise<LoginResponse>;
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>;
  refresh: (request: RefreshRequest) => Promise<RefreshResponse>;
  changePassword: (request: ChangePasswordRequest) => Promise<ChangePasswordResponse>;
  requestResetPassword: (request: RequestResetPasswordRequest) => Promise<void>;
  doResetPassword: (request: DoResetPasswordRequest) => Promise<DoResetPasswordResponse>;
  requestMagicLogin: (request: RequestMagicLoginRequest) => Promise<void>;
  magicLogin: (request: MagicLoginRequest) => Promise<MagicLoginResponse['data']>;
};

/** HTTP response types */
/** These are manually copied from https://github.com/supersavehq/auth/blob/main/src/types/index.ts */

type HttpDataResponse<T> = { data: T };

export type LoginRequest = {
  email: string;
  password: string;
};
export type LoginResponseSuccess = {
  authorized: true;
  accessToken: string;
  refreshToken: string;
};
export type LoginResponseFailed = {
  authorized: false;
  message?: string;
};

export type LoginResponse = LoginResponseSuccess | LoginResponseFailed;

export type LoginDataResponse = HttpDataResponse<LoginResponse>;

export type ErrorResponse = {
  message: string;
};

export type RefreshToken = {
  id: string;
  userId: string;
  expiresAt: number;
};

export type RegistrationRequest = {
  email: string;
  password: string;
  name?: string;
};
export type RegistrationResponseFailed = {
  success: false;
  message: string;
};
export type RegistrationResponseSuccess = {
  success: true;
  accessToken: string;
  refreshToken: string;
};

export type RegistrationResponse = RegistrationResponseFailed | RegistrationResponseSuccess;

export type RegistrationDataResponse = HttpDataResponse<RegistrationResponse>;

export type RefreshRequest = {
  token: string;
};
export type RefreshResponseSuccess = {
  success: true;
  accessToken: string;
};
export type RefreshResponseFailed = {
  success: false;
};
export type RefreshResponse = RefreshResponseSuccess | RefreshResponseFailed;
export type RefreshDataResponse = HttpDataResponse<RefreshResponse>;

export type ChangePasswordRequest = {
  accessToken: string;
  email: string;
  password: string;
  newPassword: string;
};

export type ChangePasswordResponseSuccess = {
  success: true;
  accessToken: string;
  refreshToken: string;
};
export type ChangePasswordResponseFailure = {
  success: false;
  reason: 'INVALID_PASSWORD' | 'UNKNOWN' | 'INVALID_TOKEN';
};
export type ChangePasswordResponse = ChangePasswordResponseSuccess | ChangePasswordResponseFailure;
export type ChangePasswordDataResponse = HttpDataResponse<ChangePasswordResponse>;

export type RequestResetPasswordRequest = {
  email: string;
};

export type DoResetPasswordRequest = {
  password: string;
  token: string;
};

export type DoResetPasswordResponseFailed = {
  success: false;
  reason: 'INVALID_TOKEN';
};

export type DoResetPasswordResponseSuccess = {
  success: true;
  accessToken: string;
  refreshToken: string;
};

export type DoResetPasswordResponse = DoResetPasswordResponseFailed | DoResetPasswordResponseSuccess;
export type DoResetPasswordDataResponse = HttpDataResponse<DoResetPasswordResponse>;

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
