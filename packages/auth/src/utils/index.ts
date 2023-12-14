import type { Config } from '../types';

export function timeInSeconds(date?: Date): number {
  if (date) {
    return Math.round(date.getTime() / 1000);
  }
  return Math.round(Date.now() / 1000);
}

export function isEndpointSecured(config: Config, path: string): boolean {
  if (config.notSecuredEndpoints.length === 0 && config.securedEndpoints.length === 0) {
    return true; // no endpoints defined, so everything is a secured endpoint.
  }

  // remember whether we are doing an optin for secure endpoints (secureEndpoints), or an opt-out(notSecuredEndpoints)
  const matchMeansSecured = config.securedEndpoints.length > 0;
  const endpointsToCheck = config.notSecuredEndpoints.length > 0 ? config.notSecuredEndpoints : config.securedEndpoints;

  for (let iter = endpointsToCheck.length - 1; iter >= 0; iter--) {
    const regexp = endpointsToCheck[iter];
    if (regexp === undefined) {
      return true; // Fallback to always secure, mostly to please the TS parser.
    }
    if (regexp.test(path)) {
      return matchMeansSecured ? true : false;
    }
  }
  return !matchMeansSecured; // no match means the opposite
}
