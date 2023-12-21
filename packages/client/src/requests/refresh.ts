import { RefreshError } from '../errors';
import type { RefreshDataResponse, RefreshRequest, Requester, TokenResponse } from '../types';

export const refresh =
  (prefix: string, requester: Requester) =>
  async (request: RefreshRequest): Promise<TokenResponse> => {
    const rsp = await requester.post<RefreshDataResponse, RefreshRequest>(`${prefix}/refresh`, request);

    if (rsp.statusCode !== 200 || rsp.data.data.success === false) {
      throw new RefreshError('Unable to refresh token.');
    }

    const { data } = rsp.data;

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  };
