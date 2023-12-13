import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateUniqueIdentifier } from '../../auth';
import { getResetPasswordTokenRepository, getUserRepository } from '../../db';
import type { Config } from '../../types';

const debug = Debug('supersave:auth:request-reset-password');

export const requestResetPassword = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    if (!req.body.email) {
      debug('No email field found in request body.');
      res.status(400).json({
        message: 'Invalid request. No email field provided.',
      });
      return;
    }
    const { email } = req.body;

    const userRepository = getUserRepository(superSave);
    const user = await userRepository.getOneByQuery(userRepository.createQuery().eq('email', email));
    if (user === null) {
      debug('User with email %s not found in database', email);
      // Don't expose via the response whether or not the user exists in the database.
      res.status(201).send();
      return;
    }

    const identifier = await generateUniqueIdentifier();

    const resetPasswordTokenRepository = getResetPasswordTokenRepository(superSave);

    // See if there already is an existing token for this user
    const existingToken = await resetPasswordTokenRepository.getOneByQuery(
      resetPasswordTokenRepository.createQuery().eq('userId', user.id)
    );
    if (existingToken !== null) {
      debug('Removing existing token for user.');
      await resetPasswordTokenRepository.deleteUsingId(existingToken.id);
    }

    await resetPasswordTokenRepository.create({
      identifier,
      expires: Math.round(Date.now() / 1000) + config.resetPasswordTokenExpiration,
      userId: user.id,
    });

    if (config.hooks?.requestResetPassword) {
      void config.hooks.requestResetPassword(user, identifier);
    }

    res.status(201).send();
  };
