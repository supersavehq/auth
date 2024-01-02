class ErrorWithStatusCode extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class ReasonError extends ErrorWithStatusCode {
  constructor(
    public readonly reason: string,
    public override readonly statusCode: number,
    message: string
  ) {
    super(statusCode, message);
  }
}

export class ChangePasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_PASSWORD' | 'INVALID_TOKEN' | 'UNKNOWN',
    public override readonly statusCode: number,
    message: string
  ) {
    super(reason, statusCode, message);
  }
}

export class DoResetPasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_TOKEN' | 'UNKNOWN',
    public override readonly statusCode: number,
    message: string
  ) {
    super(reason, statusCode, message);
  }
}

export class LoginError extends ErrorWithStatusCode {}

export class MagicLoginError extends ErrorWithStatusCode {}

export class RefreshError extends ErrorWithStatusCode {}

export class RegistrationError extends ErrorWithStatusCode {}

export class RequestMagicLoginError extends ErrorWithStatusCode {}

export class RequestResetPasswordError extends ErrorWithStatusCode {}
