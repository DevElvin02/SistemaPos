import { Router } from 'express';
import { pingDatabase } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await pingDatabase();
    res.json({ ok: true, service: 'sublimart-api', db: 'connected' });
  } catch (error) {
    next(error);
  }
});

export default router;
