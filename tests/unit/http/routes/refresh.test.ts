import type { Request, Response } from 'express';
import { getSuperSave } from '../../../utils/db';
import { refresh } from '../../../../src/http/routes';
import type {
  ErrorResponse,
  RefreshTokenResponse,
} from '../../../../src/types';
import { getUser } from '../../../utils/fixtures';
import {
  getRefreshTokenRepository,
  getUserRepository,
} from '../../../../src/db';
import { timeInSeconds } from '../../../../src/utils';
import { getConfig } from '../../../utils/config';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('refresh', () => {
  it.each([{}, undefined])(
    'returns a bad request error',
    async (requestBody) => {
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
    }
  );

  it('register a failure if token is not found.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const request = { body: { token: 'aaaa' } };
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
    });

    const request = { body: { token: 'secure-token-id' } };
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

  it('returns a failure if user is not found.', async () => {
    const superSave = await getSuperSave();

    const handler = refresh(superSave, getConfig());

    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    await refreshTokenRepository.create({
      // @ts-expect-error The create interface does not allowed id to be specified, but it does work.
      id: 'secure-token-id',
      userId: 'userA',
      expiresAt: timeInSeconds() + 99999,
    });

    const request = { body: { token: 'secure-token-id' } };
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

  it.each([undefined, jest.fn()])(
    'returns success if token was refreshed.',
    async (refreshHook) => {
      const superSave = await getSuperSave();

      const handler = refresh(superSave, {
        ...getConfig(),
        hooks:
          typeof refreshHook !== 'undefined' ? { refresh: refreshHook } : {},
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

      const request = { body: { token: 'secure-token-id' } };
      const jsonMock = jest.fn();

      const response = {
        json: jsonMock,
      };

      await handler(request as Request, response as unknown as Response);

      expect(jsonMock).toHaveBeenCalled();
      const expectedResponse: RefreshTokenResponse = expect.objectContaining({
        data: expect.objectContaining({
          success: true,
        }),
      });
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
      if (typeof refreshHook !== 'undefined') {
        expect(refreshHook).toBeCalledWith(user);
      }
    }
  );
});
