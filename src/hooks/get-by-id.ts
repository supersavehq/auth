import type { Request, Response } from 'express';
import { Collection, HookError } from 'supersave';
import Debug from 'debug';
import type { CollectionEntityWithUserId } from '../types';
import checkUserId from './check-user-id';

const debug = Debug('supersave:auth:hooks');

export default function (
  _collection: Collection,
  _req: Request,
  res: Response,
  entity: CollectionEntityWithUserId | null
): CollectionEntityWithUserId | null {
  if (entity === null) {
    return null;
  }
  const userId = checkUserId(res);

  if (entity.userId !== res.locals['auth'].userId) {
    debug('Entity userId %s does not match userId %s', entity.userId, userId);
    throw new HookError('Cannot fetch this one.', 401);
  }
  return entity;
}
