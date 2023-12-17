export type ResetPasswordToken = {
  id: string;
  identifier: string;
  expires: string;
  userId: string;
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

export type RegistrationResponse = RegistrationResponseSuccess | RegistrationResponseFailure;
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

export type ChangePasswordResponseSuccess = {
  data: {
    accessToken: string;
    refreshToken: string;
  };
};

export type RequestResetPasswordRequest = {
  email: string;
};

export type DoResetPasswordRequest = {
  password: string;
  token: string;
};

export type DoResetPasswordResponseFailed = {
  data: {
    success: false;
    reason: 'INVALID_TOKEN';
  };
};

export type DoResetPasswordResponseSuccess = {
  data: {
    success: true;
    accessToken: string;
    refreshToken: string;
  };
};

export type DoResetPasswordResponse = DoResetPasswordResponseFailed | DoResetPasswordResponseSuccess;
