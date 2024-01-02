import { MagicLoginError } from '../errors';
import type { MagicLoginRequest, MagicLoginResponse, Requester, TokenResponse } from '../types';

export const magicLogin =
  (baseUrl: string, requester: Requester) =>
  async (request: MagicLoginRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<MagicLoginResponse, MagicLoginRequest>(`${baseUrl}/magic-login`, request);

    if (rsp.statusCode !== 200 || rsp.data.data.authorized === false) {
      throw new MagicLoginError(rsp.statusCode, 'Unable to login using magic link.');
    }

    return {
      accessToken: rsp.data.data.accessToken,
      refreshToken: rsp.data.data.refreshToken,
    };
  };
