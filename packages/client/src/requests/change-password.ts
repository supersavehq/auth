import type {
  Requester,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ChangePasswordResponseSuccess,
  ChangePasswordDataResponse,
} from '../types';

export const changePassword =
  (baseUrl: string, requester: Requester) =>
  async (request: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const httpRequest = {
      email: request.email,
      newPassword: request.newPassword,
      password: request.password,
    };

    const rsp = await requester.post<
      ChangePasswordDataResponse,
      Omit<ChangePasswordRequest, 'accessToken'>
    >(`${baseUrl}/change-password`, httpRequest, {
      Authorization: `Bearer ${request.accessToken}`,
    });

    if (rsp.statusCode === 400) {
      return { success: false, reason: 'INVALID_PASSWORD' };
    } else if (rsp.statusCode === 401) {
      return { success: false, reason: 'INVALID_TOKEN' };
    } else if (rsp.statusCode !== 200) {
      console.log('@@', rsp);
      return { success: false, reason: 'UNKNOWN' };
    }

    const successResponse = rsp.data
      .data as unknown as ChangePasswordResponseSuccess;

    return {
      ...successResponse,
      success: true,
    };
  };
