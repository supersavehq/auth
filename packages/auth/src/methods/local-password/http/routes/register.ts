import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { generateTokens, hash } from '../../../../auth';
import { getUserRepository } from '../../../../db';
import type { Config, User } from '../../../../types';
import { anonymizeEmail, timeInSeconds } from '../../../../utils';
import type { RegistrationResponse } from '../../types';

const debug = Debug('supersave:auth:register');

export const register = (superSave: SuperSave, config: Config) =>
  async function (req: Request, res: Response): Promise<void> {
    const repository = getUserRepository(superSave);

    if (!req.body || !req.body.email || !req.body.password) {
      res.status(400).json({
        message: 'Invalid request. No email and/or password provided.',
      });
      return;
    }

    const { email, password, name }: { email: string; password: string; name?: string } = req.body;
    debug('Registration attempt for %s, %s.', anonymizeEmail(email), name);

    const users = await repository.getByQuery(repository.createQuery().eq('email', email).limit(1));
    if (users.length > 0) {
      debug('User found with email %s, cannot register.', anonymizeEmail(email));
      const response: RegistrationResponse = {
        data: {
          success: false,
          message: 'The emailaddress is already in use. Did you mean to login?',
        },
      };
      res.json(response);
      return;
    }

    const passwordHash = await hash.hash(password);
    const now = timeInSeconds();
    const user: Omit<User, 'id'> = {
      email,
      password: passwordHash,
      name,
      created: now,
      lastLogin: now,
    };

    const createdUser = await repository.create(user);

    // eslint-disable-next-line unicorn/no-useless-undefined
    const tokens = await generateTokens(superSave, config, createdUser, undefined);
    const response: RegistrationResponse = {
      data: {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };

    if (config.hooks?.registration) {
      void config.hooks.registration(createdUser);
    }
    res.json(response);
  };
