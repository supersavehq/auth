/* eslint-disable unicorn/no-useless-undefined */
import type { Request, Response } from 'express';
import { when } from 'jest-when';
import { checkPassword, generateTokens, hash } from '../../../../src/auth';
import { getUserRepository } from '../../../../src/db';
import { changePassword } from '../../../../src/http/routes';
import type { ChangePasswordResponseSuccess } from '../../../../src/types';
import { clear } from '../../../mysql';
import { getConfig } from '../../../utils/config';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

jest.mock('../../../../src/auth', () => {
  return {
    checkPassword: jest.fn(),
    generateTokens: jest.fn(),
    hash: {
      hash: jest.fn(),
    },
  };
});

beforeEach(clear);

describe('change-password', () => {
  it.each([{}, { username: 'user@example.com' }, { password: 'pass' }])(
    'returns a bad request error',
    async (requestBody) => {
      const superSave = await getSuperSave();

      const checkPasswordMock = checkPassword as unknown as jest.Mock<typeof checkPassword>;
      // @ts-expect-error Type checks are not understanding it.
      checkPasswordMock.mockResolvedValue(undefined);

      const handler = changePassword(superSave, getConfig());

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

    const checkPasswordMock = checkPassword as unknown as jest.Mock<typeof checkPassword>;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(false);

    const handler = changePassword(superSave, getConfig());

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
    const statusMock = jest.fn();
    const jsonMock = jest.fn();
    const response = {
      status: statusMock,
      json: jsonMock,
    };
    statusMock.mockReturnValue(response);

    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse = { message: 'Could not authorize user.' };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    expect(statusMock).toBeCalledWith(400);
  });

  it('fails on an invalid password', async () => {
    const superSave = await getSuperSave();

    const checkPasswordMock = checkPassword as unknown as jest.Mock<typeof checkPassword>;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(false);

    const handler = changePassword(superSave, getConfig());

    const passwordHash = await hash.hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: user.email, password: 'foobar' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();
    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('fails on an missing new password', async () => {
    const superSave = await getSuperSave();

    const passwordHash = await hash.hash('password');
    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(getUser({ password: passwordHash }));

    const checkPasswordMock = checkPassword as unknown as jest.Mock<typeof checkPassword>;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(user);

    const handler = changePassword(superSave, getConfig());

    const request = { body: { email: user.email, password: 'foobar' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();
    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it.each([undefined, jest.fn()])('changes password on correct input', async (changePasswordHook) => {
    const superSave = await getSuperSave();

    const passwordHash = await hash.hash('password');
    const user = getUser({ password: passwordHash });
    const checkPasswordMock = checkPassword as unknown as jest.Mock<typeof checkPassword>;
    // @ts-expect-error Type checks are not understanding it.
    checkPasswordMock.mockResolvedValue(user);

    const REFRESH_TOKEN = '123';
    const ACCESS_TOKEN = 'abc';
    const generateTokensMock = generateTokens as unknown as jest.MockedFunction<typeof generateTokens>;
    generateTokensMock.mockResolvedValue({
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
    });

    const handler = changePassword(superSave, {
      ...getConfig(),
      hooks: changePasswordHook === undefined ? {} : { changePassword: changePasswordHook },
    });

    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = {
      body: { email: user.email, password: 'foobar', newPassword: 'foobar2' },
    };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();
    const response = {
      json: jsonMock,
      status: statusMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
    const result: ChangePasswordResponseSuccess = {
      data: {
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(result);
    if (changePasswordHook !== undefined) {
      expect(changePasswordHook).toBeCalledWith(user);
    }
    when(hash.hash).calledWith('foobar').mockResolvedValue('hash-1'); // the invocation in this unit test
    when(hash.hash).calledWith('foobar2').mockResolvedValue('hash-2'); // the invocation for the new password
  });
});
