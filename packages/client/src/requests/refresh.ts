import type {
  Requester,
  RefreshRequest,
  RefreshDataResponse,
  RefreshResponse,
} from '../types';

export const refresh =
  (prefix: string, requester: Requester) =>
  async (request: RefreshRequest): Promise<RefreshResponse> => {
    const rsp = await requester.post<RefreshDataResponse, RefreshRequest>(
      `${prefix}/refresh`,
      request
    );

    const { data } = rsp.data;
    if (rsp.statusCode === 200) {
      return data;
    }
    return {
      success: false,
    };
  };
