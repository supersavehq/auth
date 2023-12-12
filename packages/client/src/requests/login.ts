import type {
  LoginResponse,
  LoginDataResponse,
  LoginRequest,
  Requester,
} from '../types';

export const login =
  (baseUrl: string, requester: Requester) =>
  async (request: LoginRequest): Promise<LoginResponse> => {
    const rsp = await requester.post<LoginDataResponse, LoginRequest>(
      `${baseUrl}/login`,
      request
    );

    const { data } = rsp.data;
    if (rsp.statusCode === 200) {
      return data;
    }

    return {
      authorized: false,
    };
  };
