/* eslint-disable unicorn/no-useless-undefined */
import type { Request, Response } from 'express';
import { getSuperSave } from '../../../utils/db';
import { login } from '../../../../src/http/routes';
import type { LoginResponse } from '../../../../src/types';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { getConfig } from '../../../utils/config';
import { clear } from '../../../mysql';
import { checkPassword, generateTokens } from '../../../../src/auth';

jest.mock('../../../../src/auth', () => {
  return {
    checkPassword: jest.fn(),
    generateTokens: jest.fn(),
  };
});

beforeEach(clear);

describe('login', () => {
  it.each([{}, { username: 'user@example.com' }, { password: 'pass' }])(
    'returns a bad request error',
    async (requestBody) => {
      const superSave = await getSuperSave();

      const checkPasswordMock = checkPassword as unknown as jest.Mock<
        typeof checkPassword
      >;
      // @ts-expect-error Type checks are not understanding it.
      checkPasswordMock.mockResolvedValue(undefined);

      const handler = login(superSave, getConfig());

      const request = { body: requestBody };
      const jsonMock = jest.fn();
      const statusMock = jest.fn();

      const response = {
        json: jsonMock,
        status: statusMock,
      };
      statusMock.mockReturnValue(response);
      await handler(request as Request, response as unknown as Response);
    }
  );

  it('fails on non-existing account', async () => {
    const superSave = await getSuperSave();

    const checkPasswordMock = checkPassword as unknown as jest.Mock<
      typeof checkPassword
    >;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(false);

    const handler = login(superSave, getConfig());

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: LoginResponse = { data: { authorized: false } };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('fails on an invalid password', async () => {
    const superSave = await getSuperSave();

    const checkPasswordMock = checkPassword as unknown as jest.Mock<
      typeof checkPassword
    >;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(false);

    const handler = login(superSave, getConfig());

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: user.email, password: 'foobar' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: LoginResponse = { data: { authorized: false } };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it.each([undefined, jest.fn()])(
    'returns tokens on a valid password',
    async (loginHook) => {
      const superSave = await getSuperSave();

      const passwordHash = await hash('password');
      const user = getUser({ password: passwordHash });

      const checkPasswordMock = checkPassword as unknown as jest.Mock<
        typeof checkPassword
      >;
      // @ts-expect-error Type checks are not understanding it.
      checkPasswordMock.mockResolvedValue(user);

      const REFRESH_TOKEN = '123';
      const ACCESS_TOKEN = 'abc';
      const generateTokensMock =
        generateTokens as unknown as jest.MockedFunction<typeof generateTokens>;
      generateTokensMock.mockResolvedValue({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });

      const handler = login(superSave, {
        ...getConfig(),
        hooks: typeof loginHook !== 'undefined' ? { login: loginHook } : {},
      });

      const userRepository = getUserRepository(superSave);
      await userRepository.create(user);

      const request = { body: { email: user.email, password: 'password' } };
      const jsonMock = jest.fn();
      const response = {
        json: jsonMock,
      };
      await handler(request as Request, response as unknown as Response);

      expect(jsonMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        data: {
          authorized: true,
          accessToken: ACCESS_TOKEN,
          refreshToken: REFRESH_TOKEN,
        },
      });
      if (typeof loginHook !== 'undefined') {
        expect(loginHook).toBeCalledWith(user);
      }
    }
  );
});
