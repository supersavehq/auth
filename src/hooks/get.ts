import { Request, Response } from 'express';
import { Collection } from 'supersave';
import Debug from 'debug';
import checkUserId from './check-user-id';

const debug = Debug('supersave:auth:hooks:get');

export default function get(
  _collection: Collection,
  req: Request,
  res: Response
): void {
  const userId = checkUserId(res);

  debug('Add a filter parameter for this specific userId %s', userId);
  req.query.userId = userId;
}
