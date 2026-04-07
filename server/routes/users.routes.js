import { Router } from 'express';
import { createHash } from 'node:crypto';
import { dbPool } from '../db/pool.js';

const router = Router();

function hashPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex');
}

function normalizeRole(role) {
  return String(role) === 'admin' ? 'admin' : 'cajero';
}

function mapUser(row) {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    role: normalizeRole(row.role),
    activo: Boolean(row.is_active),
    ultimoLogin: row.last_login_at,
  };
}

async function getActiveAdminsCount() {
  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role = 'admin' AND is_active = 1`
  );
  return Number(rows[0]?.total || 0);
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, last_login_at
       FROM users
       ORDER BY id DESC`
    );
    return res.json({ ok: true, data: rows.map(mapUser) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, name, role = 'cajero', password, activo = true } = req.body || {};
    if (!email || !name || !password) {
      return res.status(400).json({ ok: false, message: 'email, name y password son obligatorios' });
    }

    if (String(password).trim().length < 4) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const [existingRows] = await dbPool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [String(email).trim()]
    );
    if (existingRows.length) {
      return res.status(400).json({ ok: false, message: 'Ya existe un usuario con ese email' });
    }

    const [result] = await dbPool.query(
      `INSERT INTO users (email, name, role, is_active, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [String(email).trim(), String(name).trim(), role === 'admin' ? 'admin' : 'cajero', activo ? 1 : 0, hashPassword(password)]
    );

    const [rows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({ ok: true, data: mapUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, role, activo, password } = req.body || {};

    const [currentRows] = await dbPool.query(
      `SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const current = currentRows[0];
    if (!current) {
      return res.status(404).json({ ok: false, message: 'No se encontró el usuario a actualizar' });
    }

    const [existingRows] = await dbPool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`,
      [String(email).trim(), id]
    );
    if (existingRows.length) {
      return res.status(400).json({ ok: false, message: 'Ya existe un usuario con ese email' });
    }

    const nextRole = role === 'admin' ? 'admin' : 'cajero';
    const nextActive = activo ? 1 : 0;

    if ((normalizeRole(current.role) === 'admin' && current.is_active === 1) && (nextRole !== 'admin' || nextActive !== 1)) {
      const activeAdmins = await getActiveAdminsCount();
      if (activeAdmins <= 1) {
        return res.status(400).json({ ok: false, message: 'No puedes desactivar o cambiar el último administrador activo' });
      }
    }

    if (password && String(password).trim().length < 4) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 4 caracteres' });
    }

    if (password && String(password).trim()) {
      await dbPool.query(
        `UPDATE users
         SET email = ?, name = ?, role = ?, is_active = ?, password_hash = ?
         WHERE id = ?`,
        [String(email).trim(), String(name).trim(), nextRole, nextActive, hashPassword(password), id]
      );
    } else {
      await dbPool.query(
        `UPDATE users
         SET email = ?, name = ?, role = ?, is_active = ?
         WHERE id = ?`,
        [String(email).trim(), String(name).trim(), nextRole, nextActive, id]
      );
    }

    const [rows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return res.json({ ok: true, data: mapUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await dbPool.query(
      `SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ ok: false, message: 'No se encontró el usuario a eliminar' });
    }

    if (normalizeRole(current.role) === 'admin' && current.is_active === 1) {
      const activeAdmins = await getActiveAdminsCount();
      if (activeAdmins <= 1) {
        return res.status(400).json({ ok: false, message: 'No puedes eliminar el último administrador activo' });
      }
    }

    await dbPool.query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    return next(error);
  }
});

export default router;
