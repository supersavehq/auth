import { SuperSave } from 'supersave';
import { initializeDb } from '../../src/db';

export async function getSuperSave(): Promise<SuperSave> {
  const superSave = await SuperSave.create('sqlite://:memory:');

  await initializeDb(superSave);
  return superSave;
}
