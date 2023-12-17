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

export function isEmailAddress(email: string): boolean {
  const MAX_EMAIL_LENGTH = 254; // Maximum length of an email address is 254 characters
  if (email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function anonymizeString(input: string, fallback: string = 'xxx', visibleLength: number = 1): string {
  return input.length <= visibleLength * 2
    ? fallback
    : input.slice(0, visibleLength) +
        '*'.repeat(input.length - visibleLength * 2) +
        input.slice(input.length - visibleLength);
}

export function anonymizeEmail(email: string): string {
  const parts = email.split('@');
  if (!parts[0] || !parts[1]) {
    return 'anonymized@email';
  }

  const [localPart, domain] = parts;
  return `${anonymizeString(localPart)}@${domain}`;
}
