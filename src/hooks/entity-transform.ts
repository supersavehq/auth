import { Request, Response } from 'express';
import { BaseEntity, Collection } from 'supersave';
import { CollectionEntityWithUserId } from '../types';

export default function (
  collection: Collection,
  _req: Request,
  _res: Response,
  entity: CollectionEntityWithUserId
): CollectionEntityWithUserId {
  // @ts-ignore We're not allowed according to the type, but we are removing the userId in the collection response.
  delete entity.userId;

  // Also clear any related collections
  if (collection.relations.length > 0) {
    collection.relations.forEach((relation) => {
      if (relation.multiple && Array.isArray(entity[relation.field])) {
        entity[relation.field] = entity[relation.field].map(
          (relationEntity: BaseEntity) => {
            delete relationEntity.userId;
            return relationEntity;
          }
        );
      } else if (
        !relation.multiple &&
        typeof entity[relation.field] === 'object' &&
        entity[relation.field] !== null
      ) {
        delete entity[relation.field].userId;
      }
    });
  }
  return entity;
}
