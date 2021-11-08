import { Response } from 'express';
import { HookError } from 'supersave';
import Debug from 'debug';

const debug = Debug('supersave:auth:hooks');

export default function (res: Response): string {
  if (!res.locals.auth ?? !res.locals.auth.userId) {
    debug('userId is not set in res.locals.');
    throw new HookError('Could not process delete.', 500);
  }
  return res.locals.auth.userId;
}
