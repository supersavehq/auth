/* eslint-disable @typescript-eslint/no-misused-promises */
import Debug from 'debug';
import express from 'express';
import expressRateLimit from 'express-rate-limit';
import type { SuperSave } from 'supersave';
import { verifyAccessToken } from './auth';
import { initializeDatabase as initializeDatabase } from './db';
import { addCollection } from './hooks';
import { authenticate } from './http/middleware';
import { DEFAULT_LIMIT_GENERAL, DEFAULT_LIMIT_IDENTIFIER, rateLimit } from './http/rate-limit';
import { refresh } from './http/routes/refresh';
import { asyncCatch } from './http/utils';
import { initialize as initializeMethods } from './methods';
import type { Config, PartialConfig } from './types';

const debug = Debug('supersave:auth:super-save-auth');

const DEFAULT_CONFIG: Config = {
  tokenSecret: '',
  tokenAlgorithm: 'HS512',
  accessTokenExpiration: 300,
  refreshTokenExpiration: 3600 * 24 * 90, // 3 months,
  notSecuredEndpoints: [],
  securedEndpoints: [],
  methods: [],
  rateLimit: {
    general: DEFAULT_LIMIT_GENERAL,
    identifier: DEFAULT_LIMIT_IDENTIFIER,
  },
};

export async function superSaveAuth(superSave: SuperSave, providedConfig: PartialConfig) {
  if (!providedConfig.tokenSecret) {
    throw new Error('No token secret is defined.');
  }
  if (providedConfig.notSecuredEndpoints && providedConfig.securedEndpoints) {
    throw new Error('notSecuredEnpoints and securedEndpoints are mutually exclusive, you can only define one.');
  }
  if (!providedConfig.methods || providedConfig.methods.length === 0) {
    throw new Error('There are no authentication methods defined. Provide at least one methods in config.methods.');
  }

  const config: Config = {
    ...DEFAULT_CONFIG,
    ...providedConfig,
    // @ts-expect-error The typing is confused about the rate limits not being set,
    // While we know that both are always set from the default config.
    rateLimit:
      providedConfig.rateLimit === false ? false : { ...DEFAULT_CONFIG.rateLimit, ...providedConfig.rateLimit },
  };
  // set the identifier rate limit key generator to ours if it is not provided.
  if (config.rateLimit !== false && config.rateLimit.identifier && !config.rateLimit.identifier.keyGenerator) {
    // @ts-expect-error The keyGenerator is optional in the typing, but always set in the default config.
    config.rateLimit.identifier.keyGenerator = DEFAULT_LIMIT_IDENTIFIER.keyGenerator;
  }

  await initializeDatabase(superSave);

  const router = express.Router();
  if (config.rateLimit !== false) {
    debug('Adding general rate limit to router.');
    router.use(expressRateLimit(config.rateLimit.general));
  }
  router.post('/refresh', rateLimit(config.rateLimit, 'identifier'), asyncCatch(refresh(superSave, config)));

  const cleanUps = await initializeMethods(superSave, config, router);

  return {
    router,
    middleware: {
      authenticate: authenticate(config),
    },
    verifyAccessToken: (token: string) => {
      const parsedToken = verifyAccessToken(config, token);
      // @ts-expect-error Types are incorrect, there is a property sub in the parsedTokens' body.
      return parsedToken.body.sub;
    },
    addCollection: addCollection(superSave),
    stop: () => {
      for (const cleanUp of cleanUps) {
        cleanUp();
      }
    },
  };
}
