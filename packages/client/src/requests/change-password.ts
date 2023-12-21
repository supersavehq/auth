import { ChangePasswordError } from '../errors';
import type { ChangePasswordDataResponse, ChangePasswordRequest, Requester, TokenResponse } from '../types';

export const changePassword =
  (baseUrl: string, requester: Requester) =>
  async (request: ChangePasswordRequest): Promise<TokenResponse> => {
    const httpRequest = {
      email: request.email,
      newPassword: request.newPassword,
      password: request.password,
    };

    const rsp = await requester.post<ChangePasswordDataResponse, Omit<ChangePasswordRequest, 'accessToken'>>(
      `${baseUrl}/change-password`,
      httpRequest,
      {
        Authorization: `Bearer ${request.accessToken}`,
      }
    );

    if (rsp.statusCode === 400) {
      throw new ChangePasswordError('INVALID_PASSWORD');
    } else if (rsp.statusCode === 401) {
      throw new ChangePasswordError('INVALID_TOKEN');
    } else if (rsp.statusCode !== 200 || rsp.data.data.success === false) {
      throw new ChangePasswordError('UNKNOWN');
    }

    return {
      accessToken: rsp.data.data.accessToken,
      refreshToken: rsp.data.data.refreshToken,
    };
  };
