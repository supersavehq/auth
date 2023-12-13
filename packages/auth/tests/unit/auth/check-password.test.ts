import type { Request, Response } from 'express';
import { checkPassword } from '../../../src/auth';
import { hash } from '../../../src/auth/hash';
import { getUserRepository } from '../../../src/db';
import type { ErrorResponse } from '../../../src/types';
import { clear } from '../../mysql';
import { getSuperSave } from '../../utils/database';
import { getUser } from '../../utils/fixtures';

beforeEach(clear);

describe('check-password', () => {
  it.each([{}, { username: 'user@example.com' }, { password: 'pass' }])(
    'returns a bad request error',
    async (requestBody) => {
      const superSave = await getSuperSave();

      const request = { body: requestBody };
      const jsonMock = jest.fn();
      const statusMock = jest.fn();

      const response = {
        json: jsonMock,
        status: statusMock,
      };
      statusMock.mockReturnValue(response);

      const result = await checkPassword(superSave, request as Request, response as unknown as Response);

      expect(result).toBeUndefined();
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

    const request = { body: { email: 'user@example.com', password: 'foobar' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };

    const result = await checkPassword(superSave, request as Request, response as unknown as Response);

    expect(result).toStrictEqual(false);
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('fails on an invalid password', async () => {
    const superSave = await getSuperSave();

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: user.email, password: 'foobar' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };

    const result = await checkPassword(superSave, request as Request, response as unknown as Response);

    expect(result).toStrictEqual(false);
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('returns the user on a valid password', async () => {
    const superSave = await getSuperSave();

    const passwordHash = await hash('password');
    const user = getUser({ password: passwordHash });
    const userRepository = getUserRepository(superSave);
    await userRepository.create(user);

    const request = { body: { email: user.email, password: 'password' } };
    const jsonMock = jest.fn();
    const response = {
      json: jsonMock,
    };
    const result = await checkPassword(superSave, request as Request, response as unknown as Response);

    expect(result).toEqual(user);
    expect(jsonMock).not.toHaveBeenCalled();
  });
});
