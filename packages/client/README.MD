# supersave-auth client

This package provides easy-to-use access methods to interface with an [supersave auth](https://github.com/supersavehq/auth)
deployment. The examples below are in typescript, but it can be used in javascript also.

It can be used in both a browser or a server environment.

## Installation

    npm i @supersave/auth-client

## Usage

A client object is exposed that has methods to interface wit the auth server over HTTP.

### Initialization

In the initialization of the client you need to tell it where to find the auth server. This is the
endpoint to the website + the path to the `supersave/auth` library that you configured server-side.

    import { initialize } from '@supersave/auth-client';

    const client = initialize({ baseUrl: 'http://example.server.com/api/auth' });

See [Options](#Options) for more details.

### Register

Creates an account with an email address, password and optionally a username.

```javascript
// without name
const response = await client.register({email: 'test@example.com', password: '123456'})

// with name
const response = await client.register({email: 'test@example.com', password: '123456', name: 'John Doe'})

// the response, when successful
{
    success: true,
    accessToken: 'xxx';
    refreshToken: 'yyy';
}

// the response, when it fails
{
    success: false,
    message: 'The emailaddress is already taken. Did you mean to login?'
}
```

The `accessToken` can be used to request data for this user. This is not in
the scope of this client. The `refreshToken` can be used to obtain a new
accessToken when the current one expires. This is done using the [Refresh](#Refresh) call.

### Login

Obtain an accessToken and a refreshToken for an existing user.

```javascript
const response = await client.login({email: 'test@example.com', password: '123456'})

// the response, when successful
{
    authorized: true,
    accessToken: 'xxx';
    refreshToken: 'yyy';
}

// the response, when it fails
{
    authorized: false,
}
```

### Refresh

Use a `refreshToken` obtained earlier to fetch a new `accessToken`.

```javascript
const response = await client.refresh({token: 'yyy'});

// the response, when successful
{
    success: true,
    accessToken: 'xxx';
}

// the response, when it fails
{
    false: false,
}
```

### Change Password

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
export type ChangePasswordResponseSuccess = {
  success: true;
  accessToken: string;
  refreshToken: string;
};
export type ChangePasswordResponseFailure = {
  success: false;
  reason: 'INVALID_PASSWORD' | 'INVALID_TOKEN' | 'UNKNOWN';
};
```

### Request a password reset token

Request a password reset token. Use it in combination with the `requestResetPassword` hook in the server library to be able
to obtain the generated reset token.

If the function is invoked twice, the code from the first request is invalidated, only the last generated reset token is valid.

Its result is a void result, which means that the token was succesfully generated. An error is thrown if the request fails.

```typescript
// Request
export type RequestResetPasswordRequest = {
  email: string;
};
```

### Use an obtained reset token to reset a password

When a user receives a reset password token, use this endpoint to use the token to change the password.
On success, it will return a new refresh and access token.

`INVALID_TOKEN` is currently the only reason for the request failing.

All existing refresh tokens are invalidated.

```typescript
// Request
export type DoResetPasswordRequest = {
  password: string;
  token: string;
};

// Response
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

export type DoResetPasswordResponse =
  | DoResetPasswordResponseFailed
  | DoResetPasswordResponseSuccess;
```

## Options

| option    | type      | required | description                                                                                       |
| --------- | --------- | -------- | ------------------------------------------------------------------------------------------------- |
| baseUrl   | string    | Yes      | The path at which the [@supersave/auth](https://github.com/supersavehq/auth) library is deployed. |
| requester | Requester | No       | A custom implementation for http request, as explained in the section on [Requester](#requester)  |

## Requester

The client uses `fetch` to send data, if available. Which is in the browser, and Node versions 18 or higher. If you
are using the SDK in a non-browser environment and `fetch` is not available, you should provide your own implementation implementation.

The requester is expected to implement the following interface:

```typescript
export interface Requester {
  post: <T, D = any>(
    url: string,
    data?: D | undefined,
    headers?: Record<string, string>
  ) => Promise<HttpResponse<T>>;
}
```

### Axios example

This is a sample implementation of a requester in axios/typescript.

```typescript
export const requester: Requester = {
  post: async function <T, D = any>(
    url: string,
    data: D,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    try {
      const response = await axios.post<T>(
        url,
        data,
        typeof headers !== 'undefined' ? { headers } : undefined
      );
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
