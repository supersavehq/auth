import type { MagicLoginRequest, MagicLoginResponse, Requester } from '../types';

export const magicLogin =
  (baseUrl: string, requester: Requester) =>
  async (request: MagicLoginRequest): Promise<MagicLoginResponse['data']> => {
    const rsp = await requester.post<MagicLoginResponse, MagicLoginRequest>(`${baseUrl}/magic-login`, request);

    return rsp.data.data;
  };
