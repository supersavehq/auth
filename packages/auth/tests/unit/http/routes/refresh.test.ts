import type { Request, Response } from 'express';
import { when } from 'jest-when';
import { generateTokens } from '../../../../src/auth';
import { sha256 } from '../../../../src/auth/utils';
import { getRefreshTokenRepository, getUserRepository } from '../../../../src/db';
import { refresh } from '../../../../src/http/routes';
import type { ErrorResponse, RefreshTokenResponse } from '../../../../src/types';
import { timeInSeconds } from '../../../../src/utils';
import { clear } from '../../../mysql';
import { getConfig } from '../../../utils/config';
import { getSuperSave } from '../../../utils/database';
import { getUser } from '../../../utils/fixtures';

jest.mock('../../../../src/auth/utils');
jest.mock('../../../../src/auth', () => ({
  generateTokens: jest.fn(),
}));

beforeEach(clear);

describe('refresh', () => {
  it.each([{}, undefined])('returns a bad request error', async (requestBody) => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const request = { body: requestBody };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);
    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalledWith(400);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: ErrorResponse = {
      message: 'No token provided in request.',
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('register a failure if token is not found.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const request = { body: { token: 'aaaa_bbb' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RefreshTokenResponse = {
      data: {
        success: false,
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('returns a failure if token is expired.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    await refreshTokenRepository.create({
      // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
      id: 'secure-token-id',
      userId: 'userA',
      expiresAt: 15,
      tokenHash: 'xxx',
      tokenSalt: 'yyy',
    });

    const request = { body: { token: 'tokenid_secure-token-id' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RefreshTokenResponse = {
      data: {
        success: false,
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('returns a failure if the token hash does not match.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    await refreshTokenRepository.create({
      // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
      id: 'secure-token-id',
      userId: 'userA',
      expiresAt: timeInSeconds() + 99_999,
      tokenHash: 'xxx',
      tokenSalt: 'yyy',
    });

    const request = { body: { token: 'secure-token-id_ccc' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    when(sha256).calledWith('yyy_secure-token-id').mockReturnValue('not-the-xxx-hash');

    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RefreshTokenResponse = {
      data: {
        success: false,
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    expect(sha256).toHaveBeenCalled();
  });

  it('returns a failure if user is not found.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    await refreshTokenRepository.create({
      // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
      id: 'secure-token-id',
      userId: 'userA',
      expiresAt: timeInSeconds() + 99_999,
      tokenHash: 'xxx',
      tokenSalt: 'yyy',
    });

    const request = { body: { token: 'secure-token-id_aaa' } };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);

    when(sha256).calledWith('yyy_aaa').mockReturnValue('xxx');

    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RefreshTokenResponse = {
      data: {
        success: false,
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    expect(sha256).toHaveBeenCalled();
  });

  it.each([undefined, jest.fn()])('returns success if token was refreshed.', async (refreshHook) => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, {
      ...getConfig(),
      hooks: refreshHook === undefined ? {} : { refresh: refreshHook },
    });

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.create(getUser());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    await refreshTokenRepository.create({
      // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
      id: 'secure-token-id',
      userId: user.id,
      expiresAt: timeInSeconds() + 99_999,
    });

    const request = { body: { token: 'secure-token-id_aaa' } };
    const jsonMock = jest.fn();

    const response = {
      json: jsonMock,
    };

    when(sha256).calledWith('yyy_aaa').mockReturnValue('xxx');
    when(generateTokens).mockResolvedValue({ accessToken: 'aaa', refreshToken: 'bbb_ccc' });

    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RefreshTokenResponse = expect.objectContaining({
      data: expect.objectContaining({
        success: true,
      }),
    });
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    if (refreshHook !== undefined) {
      expect(refreshHook).toBeCalledWith(user);
    }
  });
});
