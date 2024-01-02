import { DoResetPasswordError } from '../errors';
import type { DoResetPasswordDataResponse, DoResetPasswordRequest, Requester, TokenResponse } from '../types';

export const doResetPassword =
  (baseUrl: string, requester: Requester) =>
  async (request: DoResetPasswordRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<DoResetPasswordDataResponse, DoResetPasswordRequest>(
      `${baseUrl}/do-reset-password`,
      request
    );

    if (rsp.statusCode !== 200) {
      throw new DoResetPasswordError('UNKNOWN', rsp.statusCode, 'Unknown.');
    }
    if (rsp.data.data.success === false) {
      throw new DoResetPasswordError(rsp.data.data.reason, rsp.statusCode, 'Failed with reason.');
    }

    return {
      accessToken: rsp.data.data.accessToken,
      refreshToken: rsp.data.data.refreshToken,
    };
  };
