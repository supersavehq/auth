import type { NextFunction, Request, Response } from 'express';
import expressRateLimit from 'express-rate-limit';
import type { Config, RateLimit } from '../../types';

export const DEFAULT_LIMIT_GENERAL: RateLimit = {
  windowMs: 30 * 1000,
  max: 5,
};
export const DEFAULT_LIMIT_IDENTIFIER: RateLimit = {
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator(req) {
    return req.body?.identifier ?? req.body?.email ?? req.body?.token;
  },
};

const passThroughMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

export function rateLimit(limit: Config['rateLimit'], type: 'general' | 'identifier') {
  if (limit === false) {
    return passThroughMiddleware;
  }
  return expressRateLimit(limit[type]);
}
