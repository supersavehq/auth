import type { Requester, RequestResetPasswordRequest } from '../types';

export const requestResetPassword =
  (baseUrl: string, requester: Requester) =>
  async (request: RequestResetPasswordRequest): Promise<void> => {
    const rsp = await requester.post<void, RequestResetPasswordRequest>(`${baseUrl}/reset-password`, request);

    if (rsp.statusCode !== 201) {
      throw new Error('Could not successfully request a reset password.');
    }
  };
