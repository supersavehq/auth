import { Request, Response } from 'express';
import { getSuperSave } from '../../../utils/db';
import { login } from '../../../../src/http/routes';
import { ErrorResponse, LoginResponse } from '../../../../src/types';
import { getUser } from '../../../utils/fixtures';
import { hash } from '../../../../src/auth/hash';
import { getUserRepository } from '../../../../src/db';
import { getConfig } from '../../../utils/config';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('login', () => {
  it.each([{}, { username: 'user@example.com' }, { password: 'pass' }])(
    'returns a bad request error',
    async (requestBody) => {
      const superSave = await getSuperSave();

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

      expect(statusMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);

      expect(jsonMock).toHaveBeenCalled();
      const expectedResponse: ErrorResponse = {
        message: 'Invalid request. No username and/or password provided.',
      };
      expect(jsonMock).toHaveBeenCalledWith(expectedResponse);
    }
  );

  it('fails on non-existing account', async () => {
    const superSave = await getSuperSave();

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

  it('returns tokens on a valid password', async () => {
    const superSave = await getSuperSave();

    const handler = login(superSave, getConfig());

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: user.email, password: 'password' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    await handler(request as Request, response as unknown as Response);

    expect(jsonMock).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorized: true }),
      })
    );
  });
});
