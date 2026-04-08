import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbPool } from '../db/pool.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function mapSettingsRow(row) {
  return {
    companyName: row.company_name,
    email: row.email,
    phone: row.phone || '',
    address: row.address || '',
    country: row.country || '',
    timezone: row.timezone || 'America/Bogota',
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    lastBackup: row.last_backup_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, company_name, email, phone, address, country, timezone,
              two_factor_enabled, last_backup_at, updated_at
       FROM system_settings
       WHERE id = 1
       LIMIT 1`
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Configuracion no inicializada' });
    }

    return res.json({ ok: true, data: mapSettingsRow(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const {
      companyName,
      email,
      phone = null,
      address = null,
      country = null,
      timezone = 'America/Bogota',
      twoFactorEnabled = false,
    } = req.body || {};

    if (!companyName || !String(companyName).trim()) {
      return res.status(400).json({ ok: false, message: 'companyName es requerido' });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({ ok: false, message: 'email es requerido' });
    }

    await dbPool.query(
      `UPDATE system_settings
       SET company_name = ?, email = ?, phone = ?, address = ?, country = ?, timezone = ?, two_factor_enabled = ?
       WHERE id = 1`,
      [
        String(companyName).trim(),
        String(email).trim(),
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
        country ? String(country).trim() : null,
        String(timezone).trim(),
        twoFactorEnabled ? 1 : 0,
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT id, company_name, email, phone, address, country, timezone,
              two_factor_enabled, last_backup_at, updated_at
       FROM system_settings
       WHERE id = 1
       LIMIT 1`
    );

    return res.json({ ok: true, data: mapSettingsRow(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post('/backup', async (req, res, next) => {
  try {
    const [productsCountRows] = await dbPool.query('SELECT COUNT(*) AS total FROM products');
    const [customersCountRows] = await dbPool.query('SELECT COUNT(*) AS total FROM customers');
    const [salesCountRows] = await dbPool.query('SELECT COUNT(*) AS total FROM sales');
    const [purchasesCountRows] = await dbPool.query('SELECT COUNT(*) AS total FROM purchases');

    const [usersRows] = await dbPool.query(
      `SELECT email, name, role, is_active, password_hash FROM users ORDER BY id`
    );

    const snapshot = {
      version: 2,
      createdAt: new Date().toISOString(),
      summary: {
        products: Number(productsCountRows[0]?.total || 0),
        customers: Number(customersCountRows[0]?.total || 0),
        sales: Number(salesCountRows[0]?.total || 0),
        purchases: Number(purchasesCountRows[0]?.total || 0),
      },
      users: usersRows,
    };

    const backupsDir = path.join(projectRoot, 'server', 'backups');
    await fs.mkdir(backupsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(backupsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    await dbPool.query('UPDATE system_settings SET last_backup_at = NOW() WHERE id = 1');

    return res.json({
      ok: true,
      data: {
        fileName,
        relativePath: path.join('server', 'backups', fileName),
        createdAt: snapshot.createdAt,
        backup: snapshot,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/restore', async (req, res, next) => {
  try {
    const { backup } = req.body || {};

    if (!backup || !Array.isArray(backup.users)) {
      return res.status(400).json({ ok: false, message: 'Archivo de respaldo inválido o sin datos de usuarios' });
    }

    let usersRestored = 0;
    for (const user of backup.users) {
      if (!user.email || !user.password_hash) continue;
      const role = ['admin', 'cajero'].includes(String(user.role)) ? String(user.role) : 'cajero';
      await dbPool.query(
        `INSERT INTO users (email, name, role, is_active, password_hash)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           role = VALUES(role),
           is_active = VALUES(is_active),
           password_hash = VALUES(password_hash)`,
        [
          String(user.email).trim().toLowerCase(),
          String(user.name || '').trim() || 'Usuario',
          role,
          user.is_active ? 1 : 0,
          String(user.password_hash),
        ]
      );
      usersRestored++;
    }

    return res.json({ ok: true, data: { usersRestored } });
  } catch (error) {
    return next(error);
  }
});

export default router;
