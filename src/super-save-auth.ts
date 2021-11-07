import { SuperSave } from 'supersave';
import express, { Router } from 'express';
import { login, register, refresh } from './http/routes';
import { initializeDb } from './db';

export async function superSaveAuth(superSave: SuperSave): Promise<Router> {
  await initializeDb(superSave);

  const router = express.Router();
  router.post('/login', login(superSave));
  router.post('/register', register(superSave));
  router.post('/refresh', refresh(superSave));
  return router;
}
