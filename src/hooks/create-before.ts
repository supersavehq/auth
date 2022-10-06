import Debug from 'debug';
import type { Request, Response } from 'express';
import type { Collection } from 'supersave';
import type { CollectionEntityWithUserId } from '..';
import checkUserId from './check-user-id';

const debug = Debug('supersave:auth:hooks:create-before');

export default function (
  _collection: Collection,
  _req: Request,
  res: Response,
  entity: Omit<CollectionEntityWithUserId, 'id,userId'>
): Omit<CollectionEntityWithUserId, 'id'> {
  const userId = checkUserId(res);

  debug('Adding userId to newly to create entity.');
  return {
    ...entity,
    userId,
  };
}
