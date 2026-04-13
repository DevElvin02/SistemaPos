import { Router } from 'express';
import { pingDatabase } from '../db/pool.js';
import { getBootstrapState } from '../index.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await pingDatabase();
    const bootstrap = getBootstrapState();
    res.json({
      ok: bootstrap.status !== 'failed',
      service: 'motorepuestos-api',
      db: 'connected',
      bootstrap,
    });
  } catch (error) {
    const bootstrap = getBootstrapState();
    res.json({
      ok: false,
      service: 'motorepuestos-api',
      db: 'disconnected',
      bootstrap,
      error: error instanceof Error ? error.message : 'Database unavailable',
    });
  }
});

export default router;
