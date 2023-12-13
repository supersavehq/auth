import { initialize } from '../..';
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

    expect(response.success).toBe(true);
  });
  test('bad request', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.register({
      email: EMAIL,
      password: '',
    });

    expect(response.success).toBe(false);
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

    expect(response.authorized).toBe(true);
    if (response.authorized) {
      // The if is so that ts understands it is the success response
      expect(response.accessToken ?? '').toBeDefined();
    }
  });
  it.each([
    ['no-success@example.com', PASSWORD],
    [EMAIL, 'invalid-password'],
  ])('password/username invalid', async (email, password) => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.login({
      email,
      password,
    });

    expect(response.authorized).toBe(false);
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
    if (!loginResponse.authorized) {
      // The if is so that ts understands it is the success response
      throw new Error('We expected the user to be authorized.');
    }

    const response = await client.refresh({
      token: loginResponse.refreshToken ?? '',
    });

    expect(response.success).toBe(true);
    if (response.success) {
      // We explicitly check it, so that TS also knows that that success === true.
      expect(response.accessToken).toBeDefined();
    }
  });
  test('invalid access token', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix, requester });

    const response = await client.refresh({
      token: 'invalid-token',
    });

    expect(response.success).toBe(false);
    // @ts-expect-error Access token is not in the type if success === false
    expect(response.accessToken).toBeUndefined();
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
      expect(response.success).toBe(true);
    });

    test('attempt a password reset with an incorrect token', async () => {
      const serverInfo = await serverInfoPromise;

      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const response = await client.doResetPassword({
        token: 'xyz',
        password: PASSWORD,
      });
      expect(response.success).toBe(false);
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

      expect(loginResponse.authorized).toBe(true);
      const accessToken = loginResponse.authorized ? loginResponse.accessToken : '';

      const response = await client.changePassword({
        accessToken,
        email: EMAIL,
        password: NEW_PASSWORD,
        newPassword: PASSWORD,
      });

      expect(response.success).toBe(true);
      if (response.success) {
        // The if is so that TS understand that it is the success type of response.
        expect(response.accessToken).toBeDefined();
      }
    });

    test('invalid password', async () => {
      // first, login to get an access token, with the NEW_PASSWORD, because of the password reset
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const loginResponse = await client.login({
        email: EMAIL,
        password: PASSWORD,
      });

      expect(loginResponse.authorized).toBe(true);
      const accessToken = loginResponse.authorized ? loginResponse.accessToken : '';

      const response = await client.changePassword({
        accessToken,
        email: EMAIL,
        password: 'i am invalid',
        newPassword: PASSWORD,
      });

      expect(response.success).toBe(false);
      if (!response.success) {
        // The if is so that TS understand that it is the success type of response.
        expect(response.reason).toEqual('INVALID_PASSWORD');
      }
    });

    test('invalid access token', async () => {
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix, requester });

      const response = await client.changePassword({
        accessToken: 'invalid-access-token',
        email: EMAIL,
        password: PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      expect(response.success).toBe(false);
      if (!response.success) {
        // The if is so that TS understand that it is the success type of response.
        expect(response.reason).toEqual('INVALID_TOKEN');
      }
    });
  });
});
