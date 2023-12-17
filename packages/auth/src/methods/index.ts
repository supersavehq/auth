import Debug from 'debug';
import type { Router } from 'express';
import type { SuperSave } from 'supersave';
import { initialize as initializeLocalPassword } from './local-password';
import { initialize as initializeMagicLink } from './magic-link';
import type { Config } from '../types';

const debug = Debug('supersave:auth:methods');

export async function initialize(superSave: SuperSave, config: Config, router: Router): Promise<Array<() => void>> {
  const stopMethods: Array<() => void> = [];

  for (const method of config.methods) {
    if (method.type === 'local-password') {
      debug('Initializing local password auth method.');
      const stopMethod = await initializeLocalPassword(superSave, config, method, router);
      stopMethods.push(stopMethod);
    }
    if (method.type === 'magic-link') {
      debug('Initializing magic link auth method.');
      const stopMethod = await initializeMagicLink(superSave, config, method, router);
      stopMethods.push(stopMethod);
    }
  }

  return stopMethods;
}
