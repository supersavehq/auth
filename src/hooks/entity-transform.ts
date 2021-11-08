import { Request, Response } from 'express';
import { Collection } from 'supersave';
import { CollectionEntityWithUserId } from '../types';

export default function (
  _collection: Collection,
  _req: Request,
  _res: Response,
  entity: CollectionEntityWithUserId
): CollectionEntityWithUserId {
  // @ts-ignore We're not allowed according to the type, but we are removing the userId in the collection response.
  delete entity.userId;
  return entity;
}
