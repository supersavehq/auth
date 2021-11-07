import { Request, Response } from 'express';
import Debug from 'debug';
import { verifyAccessToken } from '../../auth';
import { ErrorResponse, Config } from '../../types';
import { isEndpointSecured } from '../../utils';

const debug = Debug('supersave::auth::middleware::authenticate');

export const authenticate = (config: Config) =>
  async function (
    req: Request,
    res: Response,
    next: () => void
  ): Promise<void> {
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
      debug('The authorization header did match the format "Bearer xxx"');
      const response: ErrorResponse = {
        message: 'Authenticated user required',
      };
      res.status(401).json(response);
      return;
    }

    const token = match[1];
    try {
      const parsedToken = await verifyAccessToken(config, token);
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
