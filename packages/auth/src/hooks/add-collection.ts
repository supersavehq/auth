import type { Collection, Repository, SuperSave } from 'supersave';
import createBefore from './create-before';
import deleteBefore from './delete-before';
import entityTransform from './entity-transform';
import get from './get';
import getById from './get-by-id';
import updateBefore from './update-before';

export const addCollection = <T>(superSave: SuperSave) =>
  async function (collection: Collection): Promise<Repository<T>> {
    return await superSave.addCollection<T>({
      ...collection,
      filterSortFields: {
        ...collection.filterSortFields,
        userId: 'string',
      },
      hooks: [
        {
          get,
          // @ts-expect-error Ignore types here because we require a userId in the hook.
          getById,
          // @ts-expect-error Ignore types here because we require a userId in the hook.
          entityTransform,
          // @ts-expect-error Ignore types here because we require a userId in the hook.
          updateBefore,
          // @ts-expect-error Ignore types here because we require a userId in the hook.
          createBefore,
          // @ts-expect-error Ignore types here because we require a userId in the hook.
          deleteBefore,
        },
        ...(collection.hooks ?? []),
      ],
    });
  };
