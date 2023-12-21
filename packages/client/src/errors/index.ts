export class ReasonError extends Error {
  constructor(
    public readonly reason: string,
    message?: string
  ) {
    super(message);
  }
}

export class ChangePasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_PASSWORD' | 'INVALID_TOKEN' | 'UNKNOWN',
    message?: string
  ) {
    super(reason, message);
  }
}

export class DoResetPasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_TOKEN' | 'UNKNOWN',
    message?: string
  ) {
    super(reason, message);
  }
}

export class LoginError extends Error {}

export class MagicLoginError extends Error {}

export class RefreshError extends Error {}

export class RegistrationError extends Error {}

export class RequestMagicLoginError extends Error {}

export class RequestResetPasswordError extends Error {}
