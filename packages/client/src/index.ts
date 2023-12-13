import { getRequester } from './http-requester';
import * as requests from './requests';
import type { Client, Options } from './types';
export {
  Requester,
  HttpResponse,
  Options,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  RegistrationRequest,
  RegistrationResponse,
  Client,
  ChangePasswordRequest,
  ChangePasswordResponse,
  DoResetPasswordRequest,
  DoResetPasswordResponse,
  RequestResetPasswordRequest,
} from './types';

export function initialize(options: Options): Client {
  const requester = getRequester(options);

  const rawBaseUrl = options.baseUrl;
  const baseUrl =
    rawBaseUrl.charAt(rawBaseUrl.length) === '/' ? rawBaseUrl.slice(0, Math.max(0, rawBaseUrl.length - 1)) : rawBaseUrl;

  return {
    login: requests.login(baseUrl, requester),
    register: requests.register(baseUrl, requester),
    refresh: requests.refresh(baseUrl, requester),
    changePassword: requests.changePassword(baseUrl, requester),
    requestResetPassword: requests.requestResetPassword(baseUrl, requester),
    doResetPassword: requests.doResetPassword(baseUrl, requester),
  };
}
