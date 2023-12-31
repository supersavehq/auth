# supersave-auth client

This package provides easy-to-use access methods to interface with a [supersave auth](https://github.com/supersavehq/auth)
deployment. The examples below are in typescript, but it can be used in javascript also.

It can be used in both a browser or a server environment.

## Installation

    npm i @supersave/auth-client

### Initialization

In the initialization of the client you need to tell it where to find the auth server. This is the
endpoint to the website + the path to the `supersave/auth` library that you configured server-side. It's also possible to leave out the domain and just use the absolute path to the api (_e.g. `/api/auth`_).

    import { initialize } from '@supersave/auth-client';

    const client = initialize({ baseUrl: 'http://example.server.com/api/auth' });

See below for more details.

The available endpoints depend on how the `@supersave/auth` instance is configured.

#### Options

| option    | type      | required | description                                                                                       |
| --------- | --------- | -------- | ------------------------------------------------------------------------------------------------- |
| baseUrl   | string    | Yes      | The path at which the [@supersave/auth](https://github.com/supersavehq/auth) library is deployed. |
| requester | Requester | No       | A custom implementation for http request, as explained in the section on [Requester](#requester)  |

## Usage

A client object is exposed that has methods to interface with the auth server over HTTP.

### Refresh

Use a `refreshToken` obtained earlier to fetch a new `accessToken`. This endpoint is always available, regardless of the configured authMethods.

```typescript
const response = await client.refresh({ token: 'yyy' });

export type RefreshRequest = {
  token: string;
};

// the response, when successful. The refresh token that was used is invalidated and a new refreshToken is issued that should
// be used in the next refresh request.
{
  accessToken: 'xxx';
  refreshToken: 'yyy';
}

// A RefreshError is thrown if the request fails.
```

### Register

Scope: `local-password` auth method.

Creates an account with an email address, password and optionally a name.

```javascript
// without name
const response = await client.register({ email: 'test@example.com', password: '123456' });

// with name
const response = await client.register({ email: 'test@example.com', password: '123456', name: 'John Doe' });

export type RegistrationRequest = {
  email: string;
  password: string;
  name?: string;
};

// When it fails, a `RegistrationError` is thrown, the message of the Error is the error returned by the backend.
```

The `accessToken` can be used to request data for this user. This is not in
the scope of this client. You can use any HTTP library to request data, just include the `Authorization` header as explained earlier.
The `refreshToken` can be used to obtain a new
accessToken when the current one expires. This is done using the [Refresh](#Refresh) call.

### Login

Scope: `local-password` auth method.

Obtain an accessToken and a refreshToken for an existing user by using a username and password.

```typescript
const response = await client.login({ email: 'test@example.com', password: '123456' });

// Request
export type LoginRequest = {
  email: string;
  password: string;
};

// the response, when successful
{
  accessToken: 'xxx';
  refreshToken: 'yyy';
}

// When it fails, a LoginError is thrown.
```

### Change Password

Scope: `local-password` auth method.

Used change the password for a user. It requires a valid accessToken.

When the password is successfully changed all existing refreshTokens will be invalidated.

```typescript
// Request
export type ChangePasswordRequest = {
  accessToken: string;
  email: string;
  password: string;
  newPassword: string;
};

// Response
export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// If it fails, a ChangePasswordError is thrown, with a reason explaining why.
export class ChangePasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_PASSWORD' | 'INVALID_TOKEN' | 'UNKNOWN',
    message?: string
  ) {
    super(reason, message);
  }
}
```

### Request a password reset token

Scope: `local-password` auth method.

Request a password reset token. Use it in combination with the `requestResetPassword` hook in the server library to be able
to obtain the generated reset token.

If the function is invoked twice, the code from the first request is invalidated, only the last generated reset token is valid.

Its result is a void result, which means that the token was succesfully generated. An error is thrown if the request fails.

```typescript
const response = await client.requestResetPassword({ email: 'test@example.com' });

// Request
export type RequestResetPasswordRequest = {
  email: string;
};
```

### Use an obtained reset token to reset a password

Scope: `local-password` auth method.

When a user receives a reset password token, use this endpoint to use the token to change the password.
On success, it will return a new refresh and access token.

`INVALID_TOKEN` is currently the only reason for the request failing.

All existing refresh tokens are invalidated.

```typescript
const response = await client.doResetPassword({ password: '123456', token: 'xxx' });

// Request
export type DoResetPasswordRequest = {
  password: string;
  token: string;
};

// Response
export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// If it fails, a DoResetPasswordError is thrown:
export class DoResetPasswordError extends ReasonError {
  constructor(
    public override readonly reason: 'INVALID_TOKEN' | 'UNKNOWN',
    message?: string
  ) {
    super(reason, message);
  }
}
```

### Request a magic login

Scope: `magic-login` auth method.

Used to request a magic login token for an emailaddress. How and when the message with the login URL is send out
depends on how the callback in `@supersave/auth` is implemented.

```typescript
await client.requestMagicLogin({ email: 'test@example.com' });

// Request
export type RequestMagicLoginRequest = {
  email: string;
};

// If it fails a RequestMagicLoginError will be thrown. On success the Promise will be resolved, without any response.
```

### Login using a magic login identifier

Scope: `magic-login` auth method.

Used to exchange a magic login identifier for an accessToken and refreshToken. This magic login identifier can be obtained
by example from a parameter in a URL, which was placed there by the magic login callback in the backend.

```typescript
await client.magicLogin({ email: 'test@example.com' });

// Request
export type MagicLoginRequest = {
  identifier: string;
};

// If it fails a MagicLoginError will be thrown.
```

## Requester

The client uses `fetch` to send data, if available. Which is in the browser, and Node versions 18 or higher. If you
are using the SDK in a non-browser environment and `fetch` is not available, you should provide your own implementation.

The requester is expected to implement the following interface:

```typescript
export interface Requester {
  post: <T, D = any>(url: string, data?: D | undefined, headers?: Record<string, string>) => Promise<HttpResponse<T>>;
}
```

### Axios example

This is a sample implementation of a requester in axios/typescript.

```typescript
export const requester: Requester = {
  post: async function <T, D = any>(url: string, data: D, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    try {
      const response = await axios.post<T>(url, data, typeof headers !== 'undefined' ? { headers } : undefined);
      return {
        statusCode: response.status,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          statusCode: error.response?.status ?? 0,
          data: error.response?.data ?? {},
        };
      }

      return {
        statusCode: 0,
        data: {},
      };
    }
  },
};
```
