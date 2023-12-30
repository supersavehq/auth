import { RegistrationError } from '../errors';
import type { RegistrationDataResponse, RegistrationRequest, Requester, TokenResponse } from '../types';

export const register =
  (baseUrl: string, requester: Requester) =>
  async (request: RegistrationRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<RegistrationDataResponse, RegistrationRequest>(`${baseUrl}/register`, request);

    if (rsp.statusCode !== 200) {
      throw new RegistrationError('Error registering user.');
    }
    if (rsp.data.data.success === false) {
      throw new RegistrationError(rsp.data.data.message);
    }

    const { data } = rsp.data;

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  };
