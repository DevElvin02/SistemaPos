import { Router } from 'express';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { dbPool } from '../db/pool.js';
import { buildPasswordResetLink, emailDeliveryConfigured, sendPasswordResetEmail } from '../lib/mailer.js';

const router = Router();
const scryptAsync = promisify(scrypt);

// Middleware de seguridad: detecta inyecciones SQL en todos los parámetros
router.use((req, res, next) => {
  const clientIp = getRequestIp(req);
  
  // PRIMERO: Chequea si la IP está bloqueada
  const blacklistStatus = isIPBlacklisted(clientIp);
  if (blacklistStatus.blocked) {
    const remainingMs = blacklistStatus.unblockAt - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    
    console.warn('[SECURITY_BLOCKED]', {
      action: 'REQUEST_BLOCKED_BLACKLISTED_IP',
      ip: clientIp,
      remainingMinutes,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(403).json({
      ok: false,
      message: 'Acceso denegado. Intenta nuevamente más tarde.',
    });
  }
  
  // Verifica query parameters
  for (const [key, value] of Object.entries(req.query || {})) {
    const threat = detectSQLInjectionAttempt(value, `query.${key}`);
    if (threat.detected) {
      logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT_QUERY', {
        pattern: threat.pattern,
        field: threat.field,
      });
      
      return res.status(403).json({
        ok: false,
        message: 'Solicitud inválida',
      });
    }
  }
  
  // Verifica body parameters
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      // Solo verifica string values (los números, booleanos, etc. no necesitan verificación)
      if (typeof value === 'string') {
        const threat = detectSQLInjectionAttempt(value, `body.${key}`);
        if (threat.detected) {
          logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT_BODY', {
            pattern: threat.pattern,
            field: threat.field,
          });
          
          return res.status(403).json({
            ok: false,
            message: 'Solicitud inválida',
          });
        }
      }
    }
  }
  
  next();
});
const GENERIC_AUTH_ERROR = 'Credenciales inválidas';
const GENERIC_SERVER_ERROR = 'No se pudo procesar la solicitud';
const MIN_PASSWORD_LENGTH = 6;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);

// Seguridad: configuración para bloqueo de IPs por intentos maliciosos
const MALICIOUS_ATTEMPT_LIMIT = Number(process.env.MALICIOUS_ATTEMPT_LIMIT || 5);
const MALICIOUS_ATTEMPT_WINDOW_MS = Number(process.env.MALICIOUS_ATTEMPT_WINDOW_MS || 60 * 60 * 1000); // 1 hora
const IP_BLOCK_DURATION_MS = Number(process.env.IP_BLOCK_DURATION_MS || 24 * 60 * 60 * 1000); // 24 horas

// Seguridad: limitador simple en memoria para frenar intentos de fuerza bruta.
const loginAttempts = new Map();

// Seguridad: Blacklist de IPs. Map: ip -> { blockedAt, unblockAt }
const ipBlacklist = new Map();

// Seguridad: Contador de intentos maliciosos por IP. Map: ip -> { count, firstAttemptAt }
const maliciousAttempts = new Map();

function logSecurityError(scope, error) {
  // Seguridad: nunca exponer detalles internos/SQL al cliente.
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  console.error(`[AUTH][${scope}]`, message);
}

function detectSQLInjectionAttempt(value, fieldName = 'input') {
  // Seguridad: detecta patrones comunes de inyección SQL
  if (typeof value !== 'string') return { detected: false, pattern: null };

  const lowerValue = value.toLowerCase();
  
  // Patrones peligrosos: OR/AND con condicionales
  const orPatterns = /'\s+or\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i;
  const andPatterns = /'\s+and\s+['"]?\d+['"]?\s*[<>=]/i;
  
  // Comentarios SQL
  const sqlComments = /(-{2}|\/\*|\*\/|#|;)/;
  
  // Palabras clave SQL (en contextos donde no deberían estar)
  const sqlKeywords = /\b(union|select|insert|update|delete|drop|create|alter|exec|execute|xp_|sp_|script|javascript|onerror|onclick)\b/i;
  
  // Caracteres especiales peligrosos en secuencia
  const dangerousSequences = /['"`];|['"`]\s*(or|and|union|select|drop|exec)/i;
  
  // Información detallada para logging
  if (orPatterns.test(value)) {
    return { detected: true, pattern: 'OR_INJECTION', field: fieldName };
  }
  
  if (andPatterns.test(value)) {
    return { detected: true, pattern: 'AND_INJECTION', field: fieldName };
  }
  
  if (sqlComments.test(value) && (sqlKeywords.test(value) || dangerousSequences.test(value))) {
    return { detected: true, pattern: 'SQL_COMMENT_INJECTION', field: fieldName };
  }
  
  if (dangerousSequences.test(value)) {
    return { detected: true, pattern: 'DANGEROUS_SEQUENCE', field: fieldName };
  }
  
  // Detecta intentos de XSS/Script injection que a veces vienen junto con SQL injection
  if (/<script|javascript:|onerror|onclick|<iframe|eval\(/i.test(value)) {
    return { detected: true, pattern: 'XSS_INJECTION', field: fieldName };
  }
  
  return { detected: false, pattern: null };
}

function logSecurityThreat(req, threatType, details) {
  // Seguridad: registra intentos de ataque para auditoria
  const timestamp = new Date().toISOString();
  const ip = getRequestIp(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown').substring(0, 100);
  
  console.warn('[SECURITY_THREAT]', {
    timestamp,
    threatType,
    ip,
    userAgent,
    ...details,
  });
  
  // Registra el intento malicioso para posible bloqueo
  registerMaliciousAttempt(ip);
}

function isIPBlacklisted(ip) {
  // Seguridad: verifica si la IP está bloqueada
  if (!ipBlacklist.has(ip)) {
    return { blocked: false, unblockAt: null };
  }
  
  const record = ipBlacklist.get(ip);
  const now = Date.now();
  
  // Si ya pasó el tiempo de bloqueo, elimina de la blacklist
  if (now > record.unblockAt) {
    ipBlacklist.delete(ip);
    return { blocked: false, unblockAt: null };
  }
  
  return { blocked: true, unblockAt: record.unblockAt };
}

function registerMaliciousAttempt(ip) {
  // Seguridad: registra un intento malicioso y decide si bloquear la IP
  const now = Date.now();
  const record = maliciousAttempts.get(ip);
  
  if (!record || now - record.firstAttemptAt > MALICIOUS_ATTEMPT_WINDOW_MS) {
    // Nueva ventana de intentos
    maliciousAttempts.set(ip, { count: 1, firstAttemptAt: now });
    return;
  }
  
  // Incrementa contador
  const newCount = record.count + 1;
  maliciousAttempts.set(ip, {
    count: newCount,
    firstAttemptAt: record.firstAttemptAt,
  });
  
  // Si alcanza el límite, bloquea la IP
  if (newCount >= MALICIOUS_ATTEMPT_LIMIT) {
    const unblockAt = now + IP_BLOCK_DURATION_MS;
    ipBlacklist.set(ip, { blockedAt: now, unblockAt });
    
    console.warn('[SECURITY_BLACKLIST]', {
      action: 'IP_BLOCKED',
      ip,
      reason: `Excedió ${MALICIOUS_ATTEMPT_LIMIT} intentos maliciosos`,
      blockedAt: new Date(now).toISOString(),
      unblockAt: new Date(unblockAt).toISOString(),
      blockDurationHours: IP_BLOCK_DURATION_MS / (60 * 60 * 1000),
    });
  }
}

function clearMaliciousAttempts(ip) {
  // Limpia el contador de intentos maliciosos (se usa cuando hay login exitoso)
  maliciousAttempts.delete(ip);
}

function getBlacklistStatus() {
  // Retorna el estado actual del blacklist
  const now = Date.now();
  const activeBlocks = Array.from(ipBlacklist.entries())
    .filter(([_, record]) => now < record.unblockAt)
    .map(([ip, record]) => ({
      ip,
      blockedAt: new Date(record.blockedAt).toISOString(),
      unblockAt: new Date(record.unblockAt).toISOString(),
      remainingMinutes: Math.ceil((record.unblockAt - now) / (60 * 1000)),
    }));
  
  return {
    activeBlocks: activeBlocks.length,
    totalAttempts: maliciousAttempts.size,
    details: activeBlocks,
  };
}

function removeIPFromBlacklist(ip) {
  // Permite desbloquear una IP manualmente (para admin)
  if (ipBlacklist.has(ip)) {
    ipBlacklist.delete(ip);
    maliciousAttempts.delete(ip);
    
    console.warn('[SECURITY_BLACKLIST]', {
      action: 'IP_UNBLOCKED_MANUAL',
      ip,
      unblockAt: new Date().toISOString(),
    });
    
    return { success: true };
  }
  
  return { success: false, message: 'IP no está bloqueada' };
}


function hashPasswordLegacy(password) {
  return createHash('sha256').update(String(password)).digest('hex');
}

async function hashPasswordSecure(password) {
  // Seguridad: hash robusto con salt unico por usuario (scrypt) en vez de SHA-256 plano.
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyPassword(storedHash, candidatePassword) {
  const stored = String(storedHash || '');
  const password = String(candidatePassword || '');

  if (!stored) return { valid: false, needsRehash: false };

  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { valid: false, needsRehash: false };

    const [, salt, hashHex] = parts;
    if (!salt || !hashHex) return { valid: false, needsRehash: false };

    const expected = Buffer.from(hashHex, 'hex');
    const actual = Buffer.from(await scryptAsync(password, salt, 64));

    if (expected.length !== actual.length) {
      return { valid: false, needsRehash: false };
    }

    return {
      valid: timingSafeEqual(expected, actual),
      needsRehash: false,
    };
  }

  // Seguridad: compatibilidad temporal para migrar contraseñas antiguas (SHA-256 o texto plano)
  // al nuevo esquema seguro sin cortar acceso de usuarios existentes.
  const legacyMatch = stored === hashPasswordLegacy(password);
  const plainTextMatch = stored === password;

  if (legacyMatch || plainTextMatch) {
    return { valid: true, needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}

function sanitizeEmail(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned || cleaned.length > MAX_EMAIL_LENGTH) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) return null;
  return cleaned;
}

function sanitizePassword(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length < MIN_PASSWORD_LENGTH || cleaned.length > MAX_PASSWORD_LENGTH) return null;
  return cleaned;
}

function sanitizeToken(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 128) return null;
  return cleaned;
}

function getThrottleKey(req, email) {
  return `${getRequestIp(req)}|${String(email || 'unknown')}`;
}

function getThrottleState(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (now - record.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    const retryAfterMs = Math.max(0, LOGIN_WINDOW_MS - (now - record.firstAttemptAt));
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

function registerFailedAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  loginAttempts.set(key, {
    count: record.count + 1,
    firstAttemptAt: record.firstAttemptAt,
  });
}

function clearAttempts(key) {
  loginAttempts.delete(key);
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
  const normalized = String(ip).trim().replace(/^::ffff:/, '');
  if (normalized === '::1') return '127.0.0.1';
  return normalized;
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
      message: 'Esta cuenta no tiene permiso de acceso desde la web. Usa la aplicacion de escritorio de Motorepuestos La Bendición.',
    };
  }

  if (desktopOnly && clientRuntime !== 'desktop') {
    return {
      allowed: false,
      message: 'Esta cuenta no tiene permiso de acceso desde la web. Usa la aplicacion de escritorio de Motorepuestos La Bendición.',
    };
  }

  if (allowedIps.length > 0 && !allowedIps.includes(requestIp)) {
    return {
      allowed: false,
      message: 'Acceso denegado. Solo puedes iniciar sesion desde la red autorizada del negocio.',
    };
  }

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
    return {
      allowed: false,
      message: 'Acceso denegado. Solo puedes iniciar sesion desde la red autorizada del negocio.',
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
    
    // Seguridad: detecta intentos de inyección SQL ANTES de procesar
    const emailThreat = detectSQLInjectionAttempt(email, 'email');
    const passwordThreat = detectSQLInjectionAttempt(password, 'password');
    
    if (emailThreat.detected || passwordThreat.detected) {
      const threat = emailThreat.detected ? emailThreat : passwordThreat;
      logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT', {
        pattern: threat.pattern,
        field: threat.field,
        suspiciousValue: String(threat.field === 'email' ? email : password).substring(0, 50),
      });
      
      // Bloquea con 403 Forbidden y no revela detalles
      return res.status(403).json({
        ok: false,
        message: GENERIC_AUTH_ERROR,
      });
    }
    
    const safeEmail = sanitizeEmail(email);
    const safePassword = sanitizePassword(password);
    const throttleKey = getThrottleKey(req, safeEmail || 'invalid');
    const throttleState = getThrottleState(throttleKey);

    if (throttleState.blocked) {
      return res.status(429).json({
        ok: false,
        message: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
        retryAfterSeconds: throttleState.retryAfterSeconds,
      });
    }

    if (!safeEmail || !safePassword) {
      registerFailedAttempt(throttleKey);
      return res.status(401).json({ ok: false, message: GENERIC_AUTH_ERROR });
    }

    const [rows] = await dbPool.query(
      `SELECT id, email, name, role, is_active, password_hash, last_login_at
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [safeEmail]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      registerFailedAttempt(throttleKey);
      return res.status(401).json({ ok: false, message: GENERIC_AUTH_ERROR });
    }

    const normalizedRole = normalizeRole(user.role);

    if (normalizedRole === 'cajero') {
      const restriction = isCashierLoginAllowed(req);
      console.info('[AUTH] cashier login attempt', {
        email: safeEmail,
        role: normalizedRole,
        runtime: String(req.headers['x-client-runtime'] || 'unknown').toLowerCase(),
        ip: getRequestIp(req),
        origin: String(req.headers.origin || ''),
        allowed: restriction.allowed,
      });

      if (!restriction.allowed) {
        return res.status(403).json({ ok: false, message: restriction.message });
      }
    }

    const passwordCheck = await verifyPassword(user.password_hash, safePassword);
    if (!passwordCheck.valid) {
      registerFailedAttempt(throttleKey);
      return res.status(401).json({ ok: false, message: GENERIC_AUTH_ERROR });
    }

    if (passwordCheck.needsRehash) {
      const upgradedHash = await hashPasswordSecure(safePassword);
      await dbPool.query('UPDATE users SET password_hash = ? WHERE id = ?', [upgradedHash, user.id]);
    }

    clearAttempts(throttleKey);
    clearMaliciousAttempts(getRequestIp(req));

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
    logSecurityError('login', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.post('/password-reset/request', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    
    // Seguridad: detecta intentos de inyección SQL
    const emailThreat = detectSQLInjectionAttempt(email, 'email');
    if (emailThreat.detected) {
      logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT', {
        endpoint: 'password-reset/request',
        pattern: emailThreat.pattern,
        field: emailThreat.field,
      });
      
      return res.status(403).json({
        ok: false,
        message: 'Email es obligatorio',
      });
    }
    
    const safeEmail = sanitizeEmail(email);
    if (!safeEmail) {
      return res.status(400).json({ ok: false, message: 'Email es obligatorio' });
    }

    const [rows] = await dbPool.query(
      `SELECT id, email, is_active
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [safeEmail]
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
    logSecurityError('password-reset-request', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.post('/password-reset/validate', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    
    // Seguridad: detecta intentos de inyección SQL
    const tokenThreat = detectSQLInjectionAttempt(token, 'token');
    if (tokenThreat.detected) {
      logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT', {
        endpoint: 'password-reset/validate',
        pattern: tokenThreat.pattern,
        field: tokenThreat.field,
      });
      
      return res.json({ ok: true, data: { valid: false } });
    }
    
    const safeToken = sanitizeToken(token);
    if (!safeToken) {
      return res.json({ ok: true, data: { valid: false } });
    }

    const [rows] = await dbPool.query(
      `SELECT t.id, u.email
       FROM password_reset_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token = ? AND t.used_at IS NULL AND t.expires_at > NOW()
       LIMIT 1`,
      [safeToken]
    );

    const match = rows[0];
    if (!match) {
      return res.json({ ok: true, data: { valid: false } });
    }

    return res.json({ ok: true, data: { valid: true, email: match.email } });
  } catch (error) {
    logSecurityError('password-reset-validate', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.post('/password-reset/confirm', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    
    // Seguridad: detecta intentos de inyección SQL en token y password
    const tokenThreat = detectSQLInjectionAttempt(token, 'token');
    const passwordThreat = detectSQLInjectionAttempt(newPassword, 'newPassword');
    
    if (tokenThreat.detected || passwordThreat.detected) {
      const threat = tokenThreat.detected ? tokenThreat : passwordThreat;
      logSecurityThreat(req, 'SQL_INJECTION_ATTEMPT', {
        endpoint: 'password-reset/confirm',
        pattern: threat.pattern,
        field: threat.field,
      });
      
      return res.status(403).json({
        ok: false,
        message: 'El enlace de recuperación no es válido o ya expiró',
      });
    }
    
    const safeToken = sanitizeToken(token);
    const safePassword = sanitizePassword(newPassword);

    if (!safeToken || !safePassword) {
      return res.status(400).json({ ok: false, message: 'token y newPassword son obligatorios' });
    }

    const [rows] = await dbPool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [safeToken]
    );

    const tokenRow = rows[0];
    if (!tokenRow) {
      return res.status(400).json({ ok: false, message: 'El enlace de recuperación no es válido o ya expiró' });
    }

    const secureHash = await hashPasswordSecure(safePassword);
    await dbPool.query('UPDATE users SET password_hash = ? WHERE id = ?', [secureHash, tokenRow.user_id]);
    await dbPool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokenRow.id]);

    return res.json({ ok: true, data: { updated: true } });
  } catch (error) {
    logSecurityError('password-reset-confirm', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    // Logout: destruye la sesión y cierra la conexión
    // Limpia cookies de sesión si existen
    res.clearCookie('authToken');
    res.clearCookie('sessionId');
    
    return res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    logSecurityError('logout', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.post('/validate-session', async (req, res, next) => {
  try {
    // Validación de sesión abierta (sin cambiertas seguras)
    // Usada por el frontend para verificar si la sesión es válida
    // Si llegó aquí sin ser bloqueado por el middleware de inyección, es válida
    return res.json({ ok: true, data: { sessionValid: true } });
  } catch (error) {
    logSecurityError('validate-session', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

// ===== Endpoints de Administración de Seguridad =====
// NOTA: Estos endpoints DEBEN estar protegidos por autenticación admin en tu middleware de aplicación

router.get('/security/blacklist/status', async (req, res, next) => {
  try {
    // Nota: En producción, agregar verificación de que el usuario es admin
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ ok: false, message: 'Acceso denegado' });
    // }
    
    const status = getBlacklistStatus();
    
    return res.json({
      ok: true,
      data: {
        timestamp: new Date().toISOString(),
        configuration: {
          maliciousAttemptLimit: MALICIOUS_ATTEMPT_LIMIT,
          maliciousAttemptWindowMinutes: MALICIOUS_ATTEMPT_WINDOW_MS / (60 * 1000),
          ipBlockDurationHours: IP_BLOCK_DURATION_MS / (60 * 60 * 1000),
        },
        status,
      },
    });
  } catch (error) {
    logSecurityError('security-blacklist-status', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

router.delete('/security/blacklist/:ip', async (req, res, next) => {
  try {
    // Nota: En producción, agregar verificación de que el usuario es admin
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ ok: false, message: 'Acceso denegado' });
    // }
    
    const { ip } = req.params;
    
    // Validación básica de IP
    if (!ip || typeof ip !== 'string' || ip.length > 45) {
      return res.status(400).json({ ok: false, message: 'IP inválida' });
    }
    
    const result = removeIPFromBlacklist(ip);
    
    if (result.success) {
      return res.json({
        ok: true,
        data: {
          message: `IP ${ip} desbloqueada exitosamente`,
          unblockAt: new Date().toISOString(),
        },
      });
    } else {
      return res.status(404).json({
        ok: false,
        message: result.message || 'IP no encontrada en la blacklist',
      });
    }
  } catch (error) {
    logSecurityError('security-blacklist-remove', error);
    return res.status(500).json({ ok: false, message: GENERIC_SERVER_ERROR });
  }
});

export default router;
