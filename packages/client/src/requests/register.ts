import { RegistrationError } from '../errors';
import type { RegistrationDataResponse, RegistrationRequest, Requester, TokenResponse } from '../types';

export const register =
  (baseUrl: string, requester: Requester) =>
  async (request: RegistrationRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<RegistrationDataResponse, RegistrationRequest>(`${baseUrl}/register`, request);

    if (rsp.statusCode !== 200 || !rsp.data.data.success) {
      throw new RegistrationError('Registration failed.');
    }

    const { data } = rsp.data;

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  };
