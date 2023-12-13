import { initialize } from '../..';
import { getServer } from '../../tests/integration/utils';

/**
 * Some fetch specific tests, which can only be run on node 18.
 */

const EMAIL = 'test@test.com';
const PASSWORD = 'abcdefg';

// We combine login, register and refresh in one call so that we can re-use the supersave database.
const serverInfoPromise = getServer();

afterAll(async () => {
  const server = await serverInfoPromise;
  await server.close();
});

// Only run test when fetch is available.
const toInvoke = typeof fetch === 'undefined' ? test.skip : test;

describe('fetch - register/login/change-password', () => {
  describe('register', () => {
    toInvoke('succesful', async () => {
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix });

      const response = await client.register({
        email: EMAIL,
        password: PASSWORD,
      });

      expect(response.success).toBe(true);
    });
  });

  describe('login / change password', () => {
    let accessToken = '';

    toInvoke('login', async () => {
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix });

      const result = await client.login({ email: EMAIL, password: PASSWORD });
      expect(result.authorized).toBe(true);
      if (result.authorized) {
        accessToken = result.accessToken;
      }
    });

    toInvoke('change-password', async () => {
      const serverInfo = await serverInfoPromise;
      const client = initialize({ baseUrl: serverInfo.prefix });

      const result = await client.changePassword({
        accessToken,
        email: EMAIL,
        password: PASSWORD,
        newPassword: `${PASSWORD}2`,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('fetch - request password reset', () => {
  toInvoke('succesful', async () => {
    const serverInfo = await serverInfoPromise;
    const client = initialize({ baseUrl: serverInfo.prefix });

    await client.requestResetPassword({
      email: EMAIL,
    });
  });
});
