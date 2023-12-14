import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Makes sure that we can catch an async exception in express.
export function asyncCatch(middleware: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve(middleware(req, res, next)).catch(next);
}
