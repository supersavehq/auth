import Debug from 'debug';
import type { Request, Response } from 'express';
import type { SuperSave } from 'supersave';
import { verify } from './hash';
import { getUserRepository } from '../db';
import type { User } from '../types';
import { anonymizeEmail } from '../utils';

const debug = Debug('supersave:auth:check-password');

/* Returns undefined if this function has returned an error. */
export async function checkPassword(
  superSave: SuperSave,
  req: Request,
  res: Response
): Promise<false | undefined | User> {
  const repository = getUserRepository(superSave);

  if (!req.body || !req.body.email || !req.body.password) {
    res.status(400).json({
      message: 'Invalid request. No username and/or password provided.',
    });
    return undefined;
  }

  const { email, password }: { email: string; password: string } = req.body;
  debug('Password check for %s', anonymizeEmail(email));

  const users = await repository.getByQuery(repository.createQuery().eq('email', email).limit(1));
  if (users.length === 0) {
    return false;
  }

  if (users[0] === undefined) {
    throw new TypeError('The returned user was not an actual user object.');
  }
  const user: User = users[0];

  if (!(await verify(password, user.password))) {
    debug('Password hash does not match.');
    return false;
  }

  return user;
}
