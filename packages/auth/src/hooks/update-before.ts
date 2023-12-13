import Debug from 'debug';
import type { Request, Response } from 'express';
import { Collection, HookError } from 'supersave';
import checkUserId from './check-user-id';
import type { CollectionEntityWithUserId } from '..';

const debug = Debug('supersave:auth:update-before');

export default function (
  _collection: Collection,
  _req: Request,
  res: Response,
  entity: CollectionEntityWithUserId
): CollectionEntityWithUserId {
  const userId = checkUserId(res);

  if (entity.userId !== userId) {
    debug('The entity userId %s differs from the authenticated user %s', entity.userId, userId);
    throw new HookError('Not authorized.', 401);
  }

  return entity;
}
