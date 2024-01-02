import { RequestMagicLoginError } from '../errors';
import type { Requester, RequestMagicLoginRequest } from '../types';

export const requestMagicLogin =
  (baseUrl: string, requester: Requester) =>
  async (request: RequestMagicLoginRequest): Promise<void> => {
    const rsp = await requester.post<void, RequestMagicLoginRequest>(`${baseUrl}/get-magic-login`, request);

    if (rsp.statusCode !== 201) {
      throw new RequestMagicLoginError(rsp.statusCode, 'Could not successfully request a reset password.');
    }
  };
