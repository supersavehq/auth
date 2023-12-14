import type { Router } from 'express';
import type { SuperSave } from 'supersave';
import { initialize as initializeLocalPassword } from './local-password';
import type { Config } from '../types';

export async function initialize(superSave: SuperSave, config: Config, router: Router): Promise<Array<() => void>> {
  const stopMethods: Array<() => void> = [];

  for (const method of config.methods) {
    if (method.type === 'local-password') {
      const stopMethod = await initializeLocalPassword(superSave, config, method, router);
      stopMethods.push(stopMethod);
    }
  }

  return stopMethods;
}
