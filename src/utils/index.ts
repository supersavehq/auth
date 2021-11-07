import { Config } from '../types';

export function timeInSeconds(): number {
  return Math.round(new Date().getTime() / 1000);
}

export function isEndpointSecured(config: Config, path: string): boolean {
  if (
    config.notSecuredEndpoints.length === 0 &&
    config.securedEndpoints.length === 0
  ) {
    return true; // no endpoints defined, so everything is a secured endpoint.
  }

  // remember whether we are doing an optin for secure endpoints (secureEndpoints), or an opt-out(notSecuredEndpoints)
  const matchMeansSecured = config.securedEndpoints.length > 0;
  const endpointsToCheck =
    config.notSecuredEndpoints.length > 0
      ? config.notSecuredEndpoints
      : config.securedEndpoints;

  for (let iter = endpointsToCheck.length - 1; iter >= 0; iter--) {
    const regexp = endpointsToCheck[iter];
    if (path.match(regexp)) {
      if (matchMeansSecured) {
        return true;
      } else {
        return false;
      }
    }
  }
  return !matchMeansSecured; // no match means the opposite
}
