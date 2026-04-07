import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { dbPool } from '../db/pool.js';
import { buildPasswordResetLink, emailDeliveryConfigured, sendPasswordResetEmail } from '../lib/mailer.js';

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

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/, '');
}

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || '').split(',')[0];

  return normalizeIp(forwardedIp || req.ip || req.socket?.remoteAddress || '');
}

function isCashierLoginAllowed(req) {
  const desktopOnly = parseBoolean(process.env.CASHIER_DESKTOP_ONLY, true);
  const allowWebLogin = parseBoolean(process.env.CASHIER_ALLOW_WEB_LOGIN, false);
  const allowedIps = parseList(process.env.CASHIER_ALLOWED_IPS);
  const allowedOrigins = parseList(process.env.CASHIER_ALLOWED_ORIGINS);
  const clientRuntime = String(req.headers['x-client-runtime'] || '').toLowerCase();
  const requestIp = getRequestIp(req);
  const requestOrigin = String(req.headers.origin || '');

  if (!allowWebLogin && clientRuntime !== 'desktop') {
    return {
      allowed: false,
      message: 'El usuario cajero solo puede iniciar sesion desde la app de escritorio autorizada.',
    };
  }

  if (desktopOnly && clientRuntime !== 'desktop') {
    return {
      allowed: false,
      message: 'El usuario cajero solo puede iniciar sesion desde la app de escritorio autorizada.',
    };
  }

  if (allowedIps.length > 0 && !allowedIps.includes(requestIp)) {
    return {
      allowed: false,
      message: 'El usuario cajero solo puede iniciar sesion desde la red autorizada del negocio.',
    };
  }

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
    return {
      allowed: false,
      message: 'El usuario cajero solo puede iniciar sesion desde un origen autorizado.',
    };
  }

  return { allowed: true, message: '' };
}

async function createPasswordResetToken(userId, token, expiresAt) {
  try {
    await dbPool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [userId, token, expiresAt]
    );
    return;
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    const tokenHashRequired = code === 'ER_NO_DEFAULT_FOR_FIELD' && /token_hash/i.test(message);

    if (!tokenHashRequired) {
      throw error;
    }
  }

  await dbPool.query(
    `INSERT INTO password_reset_tokens (user_id, token, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, token, token, expiresAt]
  );
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

    if (normalizeRole(user.role) === 'cajero') {
      const restriction = isCashierLoginAllowed(req);
      console.info('[AUTH] cashier login attempt', {
        email: String(email).trim().toLowerCase(),
        role: normalizeRole(user.role),
        runtime: String(req.headers['x-client-runtime'] || 'unknown').toLowerCase(),
        ip: getRequestIp(req),
        origin: String(req.headers.origin || ''),
        allowed: restriction.allowed,
      });

      if (!restriction.allowed) {
        return res.status(403).json({ ok: false, message: restriction.message });
      }
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
    await createPasswordResetToken(user.id, token, expiresAt);

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
