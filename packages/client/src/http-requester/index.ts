import type { Options, Requester } from '../types';
import { fetchRequester } from './fetch';

export function getRequester(options: Options): Requester {
  if (options.requester) {
    return options.requester;
  }

  return fetchRequester;
}
