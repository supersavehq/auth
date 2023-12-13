import Debug from 'debug';
import type { Request, Response } from 'express';
import { verifyAccessToken } from '../../auth';
import type { Config, ErrorResponse } from '../../types';
import { isEndpointSecured } from '../../utils';

const debug = Debug('supersave:auth:middleware:authenticate');

export const authenticate = (config: Config) =>
  function (req: Request, res: Response, next: () => void): void {
    if (!isEndpointSecured(config, req.path)) {
      next();
      return;
    }

    const authorization = req.headers['authorization'] ?? null;
    if (!authorization) {
      debug('Authorization header was not set.');
      const response: ErrorResponse = {
        message: 'Authenticated user required',
      };
      res.status(401).json(response);
      return;
    }

    const match = authorization.match(/^bearer (.*)/i);
    if (!match) {
      debug('The authorization header did not match the format "Bearer xxx"');
      const response: ErrorResponse = {
        message: 'Authenticated user required',
      };
      res.status(401).json(response);
      return;
    }

    const token = match[1] ?? '';
    try {
      const parsedToken = verifyAccessToken(config, token);
      // @ts-expect-error njwt types do not define the sub on the body, but there is.
      res.locals.auth = { userId: parsedToken.body.sub };
      next();
    } catch (error) {
      debug('Error while validating the jwt: %o', error);
      const response: ErrorResponse = {
        message: 'Authenticated user required',
      };
      res.status(401).json(response);
      return;
    }
  };
