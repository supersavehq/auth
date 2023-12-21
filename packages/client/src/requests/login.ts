import { LoginError } from '../errors';
import type { LoginDataResponse, LoginRequest, Requester, TokenResponse } from '../types';

export const login =
  (baseUrl: string, requester: Requester) =>
  async (request: LoginRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<LoginDataResponse, LoginRequest>(`${baseUrl}/login`, request);

    if (rsp.statusCode === 200) {
      const { data } = rsp.data;
      if (!data.authorized) {
        throw new LoginError('Unauthorized.');
      }
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    }

    throw new LoginError('Failed to login in.');
  };
