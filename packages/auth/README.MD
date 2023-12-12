# @supersave/auth

This package enables you to build a registration / login system on top of [supersave](https://www.npmjs.com/package/supersave). It will
also leverage the hooks in supersave to only query the records, in a protected collection, of the querying user.

You can use the [auth-client](https://github.com/supersavehq/auth-client) to easily query the API this package exposes.

## How does it work?

When you want to protect a collection and store user-specific information in it, you should not invoke `addCollection` directly
on your `supersave` instance. Instead, use the `addCollection` method of this package. This will add an additional column/index
to the collection, `userId`. Any queries to the HTTP API that supersave exposes must include a `Bearer` token that identifies
a user. And only the records for that specific user will be returned.

Once you have obtained a valid `accessToken` for a user, it can be used as the token in an `Authorization` header:

    Authorization: Bearer xxx

If the accessToken is not valid, a 401 HTTP response code will be returned.

## Usage

    npm i @supersave/auth

### Configuration

First, make sure you have a configured instance of `supersave` available. Then, create a new `auth` instance using this db.

    const { router, middleware, addCollection, stop } = await superSaveAuth(superSave, {
      tokenSecret: 'xxx',
      accessTokenExpiration: 300,
    });

The four returned parameters can then be used to respectively:

1. Register the router for the `auth` endpoints
2. Middleware that you can use to protect your own custom routes. It will check if the Bearer token is provided, and will place a `userId` variable in `response.locals` of the express Response variable of your handler. Currently only `authenticate` is supported.
3. The function to use to add secured collections.
4. Stop the internal clean up process and stop the related timer interval. The interval is automatically started on initialization, and keeps
   running until the process stops, or this method is invoked.

```
// Initialization of the routes
app.use('/api/v1/auth/', router);
app.use(
    '/api/v1/secure/collections',
    middleware.authenticate,
    await superSave.getRouter('/api/v1/secure/collections')
);

// Register secure extensions
await addCollection(entities.Environment);
```

The configurations options are:

| Name                         | Required | Type             | Default            | Description                                                                                                                      |
| ---------------------------- | -------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| tokenSecret                  | Yes      | string           |                    | The secret that is used to sign the JWT. It should not be guessable and is not to be read by other processes.                    |
| tokenAlgorithm               | No       | string           | HS512              | See [njwt](https://www.npmjs.com/package/njwt#user-content-supported-algorithms) for a list of supported JWT signing algorithms. |
| accessTokenExpiration        | No       | number (seconds) | 300                | How many seconds it takes for the JWT token to expire, requiring the fetching of a new accessToken using the refreshToken.       |
| refreshTokenExpiration       | No       | number (seconds) | 7776000 (3 months) | How many seconds it takes for the refresh token to expire, forcing the user to login again.                                      |
| resetPasswordTokenExpiration | No       | number           | 3600               | The validity duration (in seconds) of a generated password reset token.                                                          |
| notSecuredEndpoints          | No       | RegExp[]         | []                 | One or more RegExps that, if matched again the path, will indicate that that specific path should not be secured.                |
| securedEndpoints             | No       | RegExp[]         | []                 | The opposite of `notSecuredEndpoints`, any paths that match will require a valid Bearer token.                                   |
| hooks                        | No       | object           | {}                 | Functions that are invoked when a specific trigger takes place within this package. See below for more information.              |

If both `securedEndpoints` and `notSecuredEndpoints` are set, all paths are treated as secure endpoints.

#### Hooks

The hooks are invoked after their specific trigger is executed. They are all optional.
An example use case is to send out e-mails for a trigger, for example when the
password changes or a password reset is requested.

| Trigger              | Signature                                                 |
| -------------------- | --------------------------------------------------------- |
| registration         | (user: User) => void \| Promise<void>                     |
| login                | (user: User) => void \| Promise<void>                     |
| refresh              | (user: User) => void \| Promise<void>                     |
| changePassword       | (user: User) => void \| Promise<void>                     |
| requestResetPassword | (user: User, identifier: string) => void \| Promise<void> |
| doResetPassword      | (user: User => void \| Promise<void>                      |

## HTTP Endpoints

Once the router returned at initialization has been registered at express, the auth endpoints can be invoked.

### Registration

Is used to register a new user. The endpoint is `/<prefix>/register`

```typescript
// Request
export type RegistrationRequest = {
  email: string;
  password: string;
  name?: string;
};

// Responses information
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
```

The returned `accessToken` can be used in requests to identify the new user.
The `refreshToken` is used in the `refresh` endpoint to obtain a new accessToken.

### Login

Is used to login a user and obtain its credentials. The endpoint is `/<prefix>/login`.

```typescript
// Login request
export type LoginRequest = {
  email: string;
  password: string;
};

// Response
export type LoginResponse = LoginResponseSuccess | LoginResponseFailed;
export type LoginResponseSuccess = {
  data: {
    authorized: true;
    accessToken: string;
    refreshToken: string;
  };
};
export type LoginResponseFailed = {
  data: {
    authorized: false;
    message: string;
  };
};
```

### Refresh

The refresh endpoint is used to exchange the refreshToken for a new accessToken. Its location is `/<prefix>/post`, and must be invoked using `POST`.

```typescript
// Request
export type RefreshRequest = {
  token: string;
};

// Response
export type RefreshResponse = RefreshResponseSuccess | RefreshResponseFailed;
export type RefreshResponseSuccess = {
  data: {
    success: true;
    accessToken: string;
  };
};
export type RefreshResponseFailed = {
  data: {
    success: false;
  };
};
```

### Change Password

This endpoint can be used to change the password for a user. It requires a valid accessToken in the `Authorization: Bearer <token>` header.
Its location is `/<prefix>/post`, and must be invoked using `POST`.

If the provided original password is not correct, a 400 (Bad Request) response will be returned.

When the password is successfully changed all existing refreshTokens will be invalidated.

```typescript
// Request
export type ChangePasswordRequest = {
  email: string;
  password: string;
  newPassword: string;
};

// Response
export type ChangePasswordResponseSuccess = {
  data: {
    accessToken: string;
    refreshToken: string;
  };
};
```

### Request Reset Password

This endpoint will generate a reset token for a user. Its path is `/<prefix>/reset-password`. For this method
you should also register a `requestResetPassword` hook, to send the URL with the identifier included to the user,
to start the flow.

If the endpoint is invoked twice, the code from the first request is invalidated, only the last generated reset token is valid.

```typescript
// Request
export type RequestResetPasswordRequest = {
  email: string;
};

// Response
// A HTTP 201 status code. The response will be the same, regardless if the user account
// has been found. The requestResetPassword hook will not be invoked if the account is not found.
```

### Do Reset Password

When a user receives a reset password token, use this endpoint to use the token to change the password. Its endpoint
is `/<prefix>/do-reset-password`. On success, it will return a new refresh and access token.

`INVALID_TOKEN` is currently the only reason for the request failing.

All existing refresh tokens are invalidated.

```typescript
// Request
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

// Response
export type DoResetPasswordResponse =
  | DoResetPasswordResponseFailed
  | DoResetPasswordResponseSuccess;
```

## Development

### Todo

- include the collection name in the logging in the hooks
- return user information on login and refresh
- return expiration information on login and refresh
- Option to reset refresh token on refresh
- typings on addCollection
- logout endpoint
- Registration: Username validation / password length / strength

## Contributing

Contributions are welcome. This does not necessarily have to be code, it can also be updated documentation, tutorials, bug reports or pull requests.

Please create an Issue to propose a feature you want to implement, so that the details can be discussed in advance.
