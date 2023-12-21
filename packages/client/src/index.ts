import { getRequester } from './http-requester';
import * as requests from './requests';
import type { Client, Options } from './types';
export {
  Requester,
  HttpResponse,
  Options,
  LoginRequest,
  RefreshRequest,
  RegistrationRequest,
  Client,
  ChangePasswordRequest,
  TokenResponse,
  DoResetPasswordRequest,
  RequestResetPasswordRequest,
  MagicLoginRequest,
  RequestMagicLoginRequest,
} from './types';
export * from './errors';

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
    requestMagicLogin: requests.requestMagicLink(baseUrl, requester),
    magicLogin: requests.magicLogin(baseUrl, requester),
  };
}
