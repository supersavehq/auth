import { Request, Response } from 'express';
import Debug from 'debug';
import { getUserRepository } from '../../db';
import { LoginResponse, User } from '../../types';
import { generateTokens, hash } from '../../auth';
import { SuperSave } from 'supersave';

const debug = Debug('supersave::auth::login');

export const login = (superSave: SuperSave) =>
  async function (req: Request, res: Response): Promise<void> {
    const repository = getUserRepository(superSave);

    if (!req.body || !req.body.email || !req.body.password) {
      res
        .status(400)
        .json({
          message: 'Invalid request. No username and/or password provided.',
        });
      return;
    }

    const { email, password }: { email: string; password: string } = req.body;
    debug('Login attempt for %s', email);

    const users = await repository.getByQuery(
      repository.createQuery().eq('email', email).limit(1)
    );
    if (users.length === 0) {
      debug('User not found with email %s.', email);
      const response: LoginResponse = { data: { authorized: false } };
      res.json(response);
      return;
    }

    const user: User = users[0];

    if (!(await hash.verify(password, user.password))) {
      debug('Password hash does not match.');
      const response: LoginResponse = { data: { authorized: false } };
      res.json(response);
      return;
    }

    const tokens = await generateTokens(superSave, user);
    const response: LoginResponse = {
      data: {
        authorized: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
    res.json(response);
  };
