import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { dbPool } from '../db/pool.js';
import { buildPasswordResetLink, emailDeliveryConfigured, sendPasswordResetEmail } from '../lib/mailer.js';

const router = Router();

function hashPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex');
}

function mapUser(row) {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    activo: Boolean(row.is_active),
    ultimoLogin: row.last_login_at,
  };
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email y contraseña son obligatorios' });
    }

    const [rows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, password_hash, last_login_at
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [String(email).trim()]
    );

    const user = rows[0];
    if (!user || !user.is_active || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ ok: false, message: 'Email o contraseña incorrectos' });
    }

    await dbPool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const [freshRows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [user.id]
    );

    return res.json({ ok: true, data: mapUser(freshRows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post('/password-reset/request', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, message: 'Email es obligatorio' });
    }

    const [rows] = await dbPool.query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [String(email).trim()]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(404).json({ ok: false, message: 'No existe una cuenta activa con ese email' });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await dbPool.query('DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL', [user.id]);
    await dbPool.query(
      `INSERT INTO password_reset_tokens (user_id, token, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [user.id, token, token, expiresAt]
    );

    let delivery;
    try {
      delivery = await sendPasswordResetEmail({
        to: user.email,
        name: user.name || user.email,
        token,
      });
    } catch (mailError) {
      const message = mailError instanceof Error ? mailError.message : 'No se pudo enviar el correo';
      const isDomainNotVerified = /domain is not verified/i.test(message);
      const isTestingRestriction = /only send testing emails|verify a domain/i.test(message);

      if (!isDomainNotVerified && !isTestingRestriction) {
        throw mailError;
      }

      delivery = {
        delivered: false,
        mode: 'preview',
        resetLink: buildPasswordResetLink(token),
      };
    }

    return res.json({
      ok: true,
      data: {
        email: user.email,
        token: delivery.delivered && emailDeliveryConfigured() ? undefined : token,
        expiresAt: expiresAt.getTime(),
        deliveryMode: delivery.mode,
        previewLink: delivery.delivered ? undefined : delivery.resetLink,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/password-reset/validate', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.json({ ok: true, data: { valid: false } });
    }

    const [rows] = await dbPool.query(
      `SELECT t.id, u.email
       FROM password_reset_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token = ? AND t.used_at IS NULL AND t.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    const match = rows[0];
    if (!match) {
      return res.json({ ok: true, data: { valid: false } });
    }

    return res.json({ ok: true, data: { valid: true, email: match.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, message: 'token y newPassword son obligatorios' });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [rows] = await dbPool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    const tokenRow = rows[0];
    if (!tokenRow) {
      return res.status(400).json({ ok: false, message: 'El enlace de recuperación no es válido o ya expiró' });
    }

    await dbPool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), tokenRow.user_id]);
    await dbPool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id]);

    return res.json({ ok: true, data: { updated: true } });
  } catch (error) {
    return next(error);
  }
});

export default router;
