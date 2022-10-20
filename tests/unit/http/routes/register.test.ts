import type { Request, Response } from 'express';
import { getSuperSave } from '../../../utils/db';
import { register } from '../../../../src/http/routes';
import type {
  ErrorResponse,
  RegistrationResponse,
} from '../../../../src/types';
import { getUser } from '../../../utils/fixtures';
import {
  getRefreshTokenRepository,
  getUserRepository,
} from '../../../../src/db';
import { getConfig } from '../../../utils/config';
import { clear } from '../../../mysql';

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

  it('registers a new user and returns tokens', async () => {
    const superSave = await getSuperSave();

    const handler = register(superSave, getConfig());

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
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

    const userRepository = await getUserRepository(superSave);
    const users = await userRepository.getByQuery(
      userRepository.createQuery().eq('email', 'user@example.com')
    );
    expect(users).toHaveLength(1);

    const tokenResponse = jsonMock.mock.calls[0][0];
    const refreshTokenRepository = getRefreshTokenRepository(superSave);
    const token = await refreshTokenRepository.getById(
      tokenResponse.data.refreshToken
    );
    expect(token).toBeDefined();
  });

  it('invokes the registration callback after a succesful registration', async () => {
    const superSave = await getSuperSave();

    const registrationCallback = jest.fn();
    const handler = register(superSave, {
      ...getConfig(),
      callbacks: { registration: registrationCallback },
    });

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
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
    expect(registrationCallback).toBeCalled();
  });
});
