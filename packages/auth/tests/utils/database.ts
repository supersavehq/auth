import { SuperSave } from 'supersave';
import { initializeDatabase } from '../../src/db';
import getConnection from '../connection';

export async function getSuperSave(): Promise<SuperSave> {
  const superSave = await SuperSave.create(getConnection());

  await initializeDatabase(superSave);
  return superSave;
}
