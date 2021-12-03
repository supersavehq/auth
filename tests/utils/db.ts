import { SuperSave } from 'supersave';
import { initializeDb } from '../../src/db';
import getConnection from '../connection';

export async function getSuperSave(): Promise<SuperSave> {
  const superSave = await SuperSave.create(getConnection());

  await initializeDb(superSave);
  return superSave;
}
