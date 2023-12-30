import add from 'date-fns/add';
import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { randomBytes, sha256 } from '../../../../auth/utils';
import { getUserRepository } from '../../../../db';
import type { AuthMethodMagicLink, Config, ErrorResponse, User } from '../../../../types';
import { anonymizeEmail, isEmailAddress, timeInSeconds } from '../../../../utils';
import { getMagicLoginTokenRepository } from '../../database';

const debug = Debug('supersave:auth:request-magic-login');

const MAGIC_LINK_EXPIRATION = 1800;
export const HASH_SEPARATOR = '_';
export const IDENTIFIER_SEPARATOR = '_';

async function getOrCreateUser(superSave: SuperSave, email: string): Promise<User> {
  const userRepository = getUserRepository(superSave);
  const user = await userRepository.getOneByQuery(userRepository.createQuery().eq('email', email));
  if (user) {
    debug('Found existing user when creating link %s', user.id);
    return user;
  }

  const now = timeInSeconds();
  return userRepository.create({
    email,
    created: now,
    password: '',
    lastLogin: now,
  });
}

export const requestMagicLogin = (superSave: SuperSave, config: Config, authConfig: AuthMethodMagicLink) =>
  async function (req: Request, res: Response): Promise<void> {
    debug('Generating magic link for user with email %s', anonymizeEmail(req.body.email));

    const { email } = req.body;
    if (!isEmailAddress(email)) {
      debug('Invalid email address provided');
      res.status(400).json({
        message: 'Invalid email address provided.',
      } satisfies ErrorResponse);
      return;
    }

    const user = await getOrCreateUser(superSave, email);

    const longSalt = await randomBytes();
    const shortenedSalt = longSalt.toString('hex').slice(0, 32);
    const identifier = await randomBytes();
    const identifierHash = sha256(`${shortenedSalt}${HASH_SEPARATOR}${identifier.toString('hex')}`);

    const magicLinkRepository = getMagicLoginTokenRepository(superSave);

    const expiration = add(new Date(), { seconds: authConfig.magicLoginExpiration ?? MAGIC_LINK_EXPIRATION });
    const magicLink = await magicLinkRepository.create({
      user,
      expires: expiration.toISOString(),
      identifierHash,
      identifierSalt: shortenedSalt,
    });

    const outputIdentifier = `${magicLink.id}${IDENTIFIER_SEPARATOR}${identifier.toString('hex')}`;

    await authConfig.sendMagicIdentifier(user, outputIdentifier, expiration);
    if (config.hooks?.requestMagicLogin) {
      void config.hooks.requestMagicLogin(user, outputIdentifier, expiration);
    }

    res.status(201).end();
  };
