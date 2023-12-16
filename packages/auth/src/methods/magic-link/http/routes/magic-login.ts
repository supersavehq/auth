import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { HASH_SEPARATOR, IDENTIFIER_SEPARATOR } from './request-magic-login';
import { generateTokens } from '../../../../auth';
import { sha256 } from '../../../../auth/utils';
import { getUserRepository } from '../../../../db';
import type { Config, ErrorResponse } from '../../../../types';
import { anonymizeString, timeInSeconds } from '../../../../utils';
import { getMagicLoginTokenRepository } from '../../database';
import type { MagicLoginResponseFailure, MagicLoginResponseSuccess } from '../../types';

const debug = Debug('supersave:auth:magic-login');

export const magicLogin = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    const { identifier } = req.body;
    if (!identifier) {
      debug('No identifier provided.');
      res.status(400).json({
        message: 'No identifier provided.',
      } satisfies ErrorResponse);
      return;
    }

    debug('Incoming request to login user magic link identifier %s.', anonymizeString(identifier, 'xxx', 3));

    const identifierParts = identifier.split(IDENTIFIER_SEPARATOR);
    if (!identifierParts[0] || !identifierParts[1]) {
      debug('The provided identifier is invalid, it did not split into 2 parts.');
      res.status(400).json({ message: 'Invalid identifier provided in request.' });
      return;
    }

    const [magicLinkId, identifierValue] = identifierParts;

    const magicLinkRepository = getMagicLoginTokenRepository(superSave);
    const magicLink = await magicLinkRepository.getById(magicLinkId);
    if (!magicLink) {
      const response: MagicLoginResponseFailure = { data: { authorized: false } };
      res.json(response);
      return;
    }

    const tokenHash = sha256(`${magicLink.identifierSalt}${HASH_SEPARATOR}${identifierValue}`);
    if (tokenHash !== magicLink.identifierHash) {
      debug('Refresh token hash does not match. %s !== %s', tokenHash, magicLink.identifierHash);
      const response: MagicLoginResponseFailure = { data: { authorized: false } };
      res.status(200).json(response);
      return;
    }

    if (magicLink.expires < new Date().toISOString()) {
      res.json({ data: { authorized: false, message: 'The token has expired.' } } satisfies MagicLoginResponseFailure);
      return;
    }

    // eslint-disable-next-line unicorn/no-useless-undefined
    const tokens = await generateTokens(superSave, config, magicLink.user, undefined);

    const userRepository = getUserRepository(superSave);
    const user = magicLink.user;
    user.lastLogin = timeInSeconds();
    debug('Updating user %s lastLogin timestamp %s.', user.id, user.lastLogin);
    await userRepository.update(user);

    if (config.hooks?.magicLink) {
      void config.hooks.magicLink(user);
    }

    // Remove the magic link token after it has been used.
    await magicLinkRepository.deleteUsingId(magicLinkId);

    const response: MagicLoginResponseSuccess = {
      data: {
        authorized: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
    res.json(response);
  };
