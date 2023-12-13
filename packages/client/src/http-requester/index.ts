import { fetchRequester } from './fetch';
import type { Options, Requester } from '../types';

export function getRequester(options: Options): Requester {
  if (options.requester) {
    return options.requester;
  }

  return fetchRequester;
}
