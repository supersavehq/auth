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

    const { router, middleware, addCollection } = await superSaveAuth(superSave, {
      tokenSecret: 'xxx',
      accessTokenExpiration: 300,
    });

The three returned parameters can then be used to respectively:

1. Register the router for the `auth` endpoints
2. Middleware that you can use to protect your own custom routes. It will check if the Bearer token is provided, and will place a `userId` variable in `response.locals` of the express Response variable of your handler. Currently only `authenticate` is supported.
3. The function to use to add secured collections.

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

| Name                   | Required | Type             | Default            | Description                                                                                                                      |
| ---------------------- | -------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| tokenSecret            | Yes      | string           |                    | The secret that is used to sign the JWT. It should not be guessable and is not to be read by other processes.                    |
| tokenAlgorithm         | No       | string           | HS512              | See [njwt](https://www.npmjs.com/package/njwt#user-content-supported-algorithms) for a list of supported JWT signing algorithms. |
| accessTokenExpiration  | No       | number (seconds) | 300                | How many seconds it takes for the JWT token to expire, requiring the fetching of a new accessToken using the refreshToken.       |
| refreshTokenExpiration | No       | number (seconds) | 7776000 (3 months) | How many seconds it takes for the refresh token to expire, forcing the user to login again.                                      |
| notSecuredEndpoints    | No       | RegExp[]         | []                 | One or more RegExps that, if matched again the path, will indicate that that specific path should not be secured.                |
| securedEndpoints       | No       | RegExp[]         | []                 | The opposite of `notSecuredEndpoints`, any paths that match will require a valid Bearer token.                                   |
| hooks                  | No       | object           | {}                 | Functions that are invoked when a specific trigger takes place within this package. See below for more information.              |

If both `securedEndpoints` and `notSecuredEndpoints` are set, all paths are treated as secure endpoints.

#### Hooks

The hooks are invoked after their specific trigger is executed. They are all optional.

| Trigger      | Signature                             |
| ------------ | ------------------------------------- |
| registration | (user: User) => void \| Promise<void> |

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

Is used to login a user and obtain its credentials. The endpoint is `/<prefix>/login`

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

The refresh endpoint is used to exchange the refreshToken for a new accessToken.

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
