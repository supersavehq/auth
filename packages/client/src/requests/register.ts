import type { RegistrationDataResponse, RegistrationRequest, RegistrationResponse, Requester } from '../types';

export const register =
  (baseUrl: string, requester: Requester) =>
  async (request: RegistrationRequest): Promise<RegistrationResponse> => {
    const rsp = await requester.post<RegistrationDataResponse, RegistrationRequest>(`${baseUrl}/register`, request);

    const { data } = rsp.data;
    if (rsp.statusCode === 200) {
      return data;
    }
    return {
      success: false,
      message: 'Unsuccesful request.',
    };
  };
