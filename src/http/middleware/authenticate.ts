import { Request, Response } from 'express';
import Debug from 'debug';
import { verifyAccessToken } from '../../auth';
import { ErrorResponse } from '../../types';

const debug = Debug('supersave::auth::middleware::authenticate');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authenticate(req: Request, res: Response, next: any) {
  const authorization = req.headers['authorization'] ?? null;
  if (!authorization) {
    debug('Authorization header was not set.');
    const response: ErrorResponse = { message: 'Authenticated user required' };
    res.status(401).json(response);
    return;
  }

  const match = authorization.match(/^bearer (.*)/i);
  if (!match) {
    debug('The authorization header did match the format "Bearer xxxx"');
    const response: ErrorResponse = { message: 'Authenticated user required' };
    res.status(401).json(response);
    return;
  }

  const token = match[1];
  try {
    const parsedToken = await verifyAccessToken(token);
    // @ts-expect-error njwt types do not define the sub on the body, but there is.
    res.locals.auth = { userId: parsedToken.body.sub };
    next();
  } catch (error) {
    debug('Error while validating the jwt: %o', error);
    const response: ErrorResponse = { message: 'Authenticated user required' };
    res.status(401).json(response);
    return;
  }
}
