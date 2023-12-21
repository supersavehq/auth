import {
  ChangePasswordError,
  DoResetPasswordError,
  initialize,
  LoginError,
  MagicLoginError,
  RefreshError,
  RegistrationError,
} from '../..';
import { getServer, requester } from '../../tests/integration/utils';

const EMAIL = 'test@test.com';
const PASSWORD = 'abcdefg';
const NEW_PASSWORD = 'gfedcba';

// We combine login, register and refresh in one call so that we can re-use the supersave database.
const serverInfoPromise = getServer();

afterAll(async () => {
  const server = await serverInfoPromise;
  await server.close();
});

describe('register', () => {
  test('succesful', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.register({
      email: EMAIL,
      password: PASSWORD,
    });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });
  test('bad request', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    await expect(
      client.register({
        email: EMAIL,
        password: '',
      })
    ).rejects.toThrow(RegistrationError);
  });
});

describe('login', () => {
  test('successful', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.login({
      email: EMAIL,
      password: PASSWORD,
    });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });

  it.each([
    ['no-success@example.com', PASSWORD],
    [EMAIL, 'invalid-password'],
  ])('password/username invalid', async (email, password) => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    await expect(
      client.login({
        email,
        password,
      })
    ).rejects.toThrow(LoginError);
  });
});

describe('refresh', () => {
  test('success', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    // first login to get the access token
    const loginResponse = await client.login({
      email: EMAIL,
      password: PASSWORD,
    });

    const response = await client.refresh({
      token: loginResponse.refreshToken ?? '',
    });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });

  test('invalid access token', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    await expect(
      client.refresh({
        token: 'invalid-token',
      })
    ).rejects.toThrow(RefreshError);
  });

  describe('reset password', () => {
    test('request a reset token', async () => {
      const serverInfo = await serverInfoPromise;

      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      await client.requestResetPassword({ email: EMAIL });
      expect(serverInfo.getResetToken()).not.toBe('');
    });

    test('perform a password reset', async () => {
      const serverInfo = await serverInfoPromise;

      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const response = await client.doResetPassword({
        token: serverInfo.getResetToken(),
        password: NEW_PASSWORD,
      });
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
    });

    test('attempt a password reset with an incorrect token', async () => {
      const serverInfo = await serverInfoPromise;

      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      await expect(
        client.doResetPassword({
          token: 'xyz',
          password: PASSWORD,
        })
      ).rejects.toThrow(DoResetPasswordError);
    });
  });

  describe('change password', () => {
    test('successful change', async () => {
      // first, login to get an access token, with the NEW_PASSWORD, because of the password reset
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const loginResponse = await client.login({
        email: EMAIL,
        password: NEW_PASSWORD,
      });

      const { accessToken } = loginResponse;

      const response = await client.changePassword({
        accessToken,
        email: EMAIL,
        password: NEW_PASSWORD,
        newPassword: PASSWORD,
      });

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
    });

    test('invalid password', async () => {
      // first, login to get an access token, with the NEW_PASSWORD, because of the password reset
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const loginResponse = await client.login({
        email: EMAIL,
        password: PASSWORD,
      });

      const { accessToken } = loginResponse;

      try {
        await client.changePassword({
          accessToken,
          email: EMAIL,
          password: 'i am invalid',
          newPassword: PASSWORD,
        });
        expect(false).toBeTruthy(); // We should never get here, error should be thrown.
      } catch (error) {
        expect(error).toBeInstanceOf(ChangePasswordError);
        if (error instanceof ChangePasswordError) {
          // so that TS understands it is this error type.
          expect(error.reason).toEqual('INVALID_PASSWORD');
        }
      }
    });

    test('invalid access token', async () => {
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      try {
        await client.changePassword({
          accessToken: 'invalid-access-token',
          email: EMAIL,
          password: PASSWORD,
          newPassword: NEW_PASSWORD,
        });
        expect(false).toBeTruthy(); // We should never get here, error should be thrown.
      } catch (error) {
        expect(error).toBeInstanceOf(ChangePasswordError);
        if (error instanceof ChangePasswordError) {
          // so that TS understands it is this error type.
          expect(error.reason).toEqual('INVALID_TOKEN');
        }
      }
    });
  });
});

describe('request-magic-login', () => {
  test('successful', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    await client.requestMagicLogin({
      email: EMAIL,
    });
    expect(serverInfo.getMagicLinkIdentifier()).toBeDefined();
  });
});

describe('magic-login', () => {
  test('successful', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.magicLogin({
      identifier: serverInfo.getMagicLinkIdentifier(),
    });
    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });

  test('invalid-token', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    await expect(
      client.magicLogin({
        identifier: 'really-invalid-token',
      })
    ).rejects.toThrow(MagicLoginError);
  });
});
