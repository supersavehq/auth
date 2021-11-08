import { Request, Response } from 'express';
import { Collection, HookError } from 'supersave';
import Debug from 'debug';
import { CollectionEntityWithUserId } from '../types';
import checkUserId from './check-user-id';

const debug = Debug('supersave:auth:hooks:delete-before');

export default function (
  _collection: Collection,
  _req: Request,
  res: Response,
  entity: CollectionEntityWithUserId | null
): void {
  if (entity === null) {
    debug('Ignored hook deleteBefore, item is null.');
    return;
  }
  const userId = checkUserId(res);

  // Check if the item we are deleting belongs to this user.
  if (entity.userId !== res.locals.auth.userId) {
    debug(
      'Provided entity userId %s does not match local userId %s',
      entity.userId,
      userId
    );
    throw new HookError('Not authorized.', 401);
  }
}
