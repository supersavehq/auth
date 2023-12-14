import type { Request, Response } from 'express';
import { getRefreshTokenRepository, getUserRepository } from '../../../../../../src/db';
import { register } from '../../../../../../src/methods/local-password/http/routes/register';
import type { RegistrationResponse } from '../../../../../../src/methods/local-password/types';
import type { ErrorResponse } from '../../../../../../src/types';
import { clear } from '../../../../../mysql';
import { getConfig } from '../../../../../utils/config';
import { getSuperSave } from '../../../../../utils/database';
import { getUser } from '../../../../../utils/fixtures';

beforeEach(clear);

describe('register', () => {
  it.each([
    {},
    { username: 'user@example.com' },
    { password: 'pass' },
    { username: 'user@example.com', name: 'Arthur' },
  ])('returns a bad request error', async (requestBody) => {
    const superSave = await getSuperSave();

    const handler = register(superSave, getConfig());

    const request = { body: requestBody };
    const jsonMock = jest.fn();
    const statusMock = jest.fn();

    const response = {
      json: jsonMock,
      status: statusMock,
    };
    statusMock.mockReturnValue(response);
    await handler(request as Request, response as unknown as Response);

    expect(statusMock).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: ErrorResponse = {
      message: 'Invalid request. No email and/or password provided.',
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it('fails on existing account', async () => {
    const superSave = await getSuperSave();

    const handler = register(superSave, getConfig());

    const user = getUser();
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    const expectedResponse: RegistrationResponse = {
      data: {
        success: false,
        message: 'The emailaddress is already taken. Did you mean to login?',
      },
    };
    expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
  });

  it.each([undefined, jest.fn()])('registers a new user and returns tokens', async (registrationHook) => {
    const superSave = await getSuperSave();

    const handler = register(superSave, {
      ...getConfig(),
      hooks: registrationHook === undefined ? {} : { registration: registrationHook },
    });

    const request = {
      body: { email: 'user@example.com', password: 'foobar' },
    };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true }),
      })
    );

    const userRepository = getUserRepository(superSave);
    const users = await userRepository.getByQuery(userRepository.createQuery().eq('email', 'user@example.com'));
    expect(users).toHaveLength(1);

    const tokenResponse = jsonMock.mock.calls[0][0];
    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const token = await refreshTokenRepository.getById(tokenResponse.data.refreshToken);
    expect(token).toBeDefined();
    if (registrationHook !== undefined) {
      expect(registrationHook).toBeCalledWith(users[0]);
    }
  });
});
