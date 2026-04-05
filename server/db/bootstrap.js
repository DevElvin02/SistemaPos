import { dbPool } from './pool.js';
import { createHash } from 'node:crypto';

function hashPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex');
}

async function tableExists(tableName) {
  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) return;
  const query = `ALTER TABLE ${tableName} ADD COLUMN ${definition}`;
  await dbPool.query(query);
}

async function fkExists(tableName, constraintName) {
  const [rows] = await dbPool.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [tableName, constraintName]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function dropFkIfExists(tableName, constraintName) {
  if (!(await fkExists(tableName, constraintName))) return;
  await dbPool.query(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName}`);
}

async function dropAllFksReferencingUsers() {
  const [rows] = await dbPool.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = 'users'
       AND CONSTRAINT_NAME IS NOT NULL`
  );

  for (const row of rows) {
    const tableName = String(row.TABLE_NAME || '');
    const constraintName = String(row.CONSTRAINT_NAME || '');
    if (!tableName || !constraintName) continue;
    await dropFkIfExists(tableName, constraintName);
  }
}

export async function bootstrapSchema() {
  await dbPool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      role ENUM('admin', 'cajero') NOT NULL DEFAULT 'cajero',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      password_hash VARCHAR(128) NOT NULL,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  // Compatibilidad con esquemas legacy que usan role_id en users
  if (!(await columnExists('users', 'role'))) {
    await addColumnIfMissing('users', 'role', "role ENUM('admin', 'cajero') NOT NULL DEFAULT 'cajero' AFTER name");
  }

  const hasRoleIdColumn = await columnExists('users', 'role_id');
  if (hasRoleIdColumn) {
    // Permite inserts sin role_id explícito desde el flujo nuevo.
    await dbPool.query('ALTER TABLE users MODIFY role_id BIGINT UNSIGNED NULL');
  }

  if (hasRoleIdColumn) {
    await dbPool.query(
      `UPDATE users u
       LEFT JOIN roles r ON r.id = u.role_id
       SET u.role = CASE
         WHEN r.name IN ('admin', 'cajero') THEN r.name
         WHEN u.role = 'admin' THEN 'admin'
         ELSE 'cajero'
       END`
    );
  }

  await dbPool.query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      token VARCHAR(120) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_reset_user (user_id),
      CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  );

  if (!(await columnExists('password_reset_tokens', 'token'))) {
    await addColumnIfMissing('password_reset_tokens', 'token', 'token VARCHAR(120) NULL AFTER user_id');
  }

  if (await columnExists('password_reset_tokens', 'token_hash')) {
    await dbPool.query(
      `UPDATE password_reset_tokens
       SET token = COALESCE(token, token_hash)
       WHERE token IS NULL OR token = ''`
    );
  }

  const [adminRows] = await dbPool.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['admin@example.com']);
  if (!adminRows.length) {
    if (hasRoleIdColumn && (await tableExists('roles'))) {
      await dbPool.query(
        `INSERT INTO users (role_id, email, name, role, is_active, password_hash)
         VALUES ((SELECT id FROM roles WHERE name = 'admin' LIMIT 1), ?, ?, 'admin', 1, ?)`,
        ['admin@example.com', 'Admin', hashPassword('admin123')]
      );
    } else {
      await dbPool.query(
        `INSERT INTO users (email, name, role, is_active, password_hash)
         VALUES (?, ?, 'admin', 1, ?)`,
        ['admin@example.com', 'Admin', hashPassword('admin123')]
      );
    }
  }

  const [cashierRows] = await dbPool.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['cajero@example.com']);
  if (!cashierRows.length) {
    if (hasRoleIdColumn && (await tableExists('roles'))) {
      await dbPool.query(
        `INSERT INTO users (role_id, email, name, role, is_active, password_hash)
         VALUES ((SELECT id FROM roles WHERE name = 'cajero' LIMIT 1), ?, ?, 'cajero', 1, ?)`,
        ['cajero@example.com', 'Cajero', hashPassword('cajero123')]
      );
    } else {
      await dbPool.query(
        `INSERT INTO users (email, name, role, is_active, password_hash)
         VALUES (?, ?, 'cajero', 1, ?)`,
        ['cajero@example.com', 'Cajero', hashPassword('cajero123')]
      );
    }
  }

  await dbPool.query(
    `UPDATE users
     SET role = CASE WHEN role = 'user' THEN 'cajero' ELSE role END`
  );

  await dbPool.query(
    `DELETE FROM password_reset_tokens
     WHERE (used_at IS NOT NULL) OR expires_at < NOW()`
  );

  await dbPool.query(
    `CREATE TABLE IF NOT EXISTS system_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NULL,
      address VARCHAR(255) NULL,
      country VARCHAR(100) NULL,
      timezone VARCHAR(100) NOT NULL DEFAULT 'America/Bogota',
      two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
      last_backup_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await dbPool.query(
    `INSERT IGNORE INTO system_settings
      (id, company_name, email, phone, address, country, timezone, two_factor_enabled, last_backup_at)
     VALUES (1, 'SUBLIMART', 'info@sublimart.com', '+1 (555) 123-4567', 'Calle Principal 123, Ciudad', 'Colombia', 'America/Bogota', 0, NULL)`
  );

  if (await tableExists('customers')) {
    await addColumnIfMissing('customers', 'company', 'company VARCHAR(150) NULL AFTER phone');
    await addColumnIfMissing('customers', 'city', 'city VARCHAR(100) NULL AFTER address');
    await addColumnIfMissing('customers', 'country', 'country VARCHAR(100) NULL AFTER city');
    await addColumnIfMissing('customers', 'status', "status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER is_active");
    await dbPool.query(
      "UPDATE customers SET status = CASE WHEN is_active = 1 AND (status IS NULL OR status = '') THEN 'active' WHEN is_active = 0 AND (status IS NULL OR status = '') THEN 'inactive' ELSE status END"
    );
  }

  if (await tableExists('suppliers')) {
    await addColumnIfMissing('suppliers', 'status', "status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER is_active");
    await addColumnIfMissing('suppliers', 'products_sold', 'products_sold JSON NULL AFTER status');
    await addColumnIfMissing('suppliers', 'website', 'website VARCHAR(255) NULL AFTER email');
    await addColumnIfMissing('suppliers', 'city', 'city VARCHAR(100) NULL AFTER address');
    await addColumnIfMissing('suppliers', 'country', 'country VARCHAR(100) NULL AFTER city');
    await addColumnIfMissing('suppliers', 'total_orders', 'total_orders INT NOT NULL DEFAULT 0 AFTER country');
    await addColumnIfMissing('suppliers', 'rating', 'rating DECIMAL(3,2) NOT NULL DEFAULT 0 AFTER total_orders');
    await addColumnIfMissing('suppliers', 'payment_terms', 'payment_terms VARCHAR(100) NULL AFTER rating');
    await addColumnIfMissing('suppliers', 'join_date', 'join_date DATETIME NULL AFTER payment_terms');
    await dbPool.query(
      "UPDATE suppliers SET status = CASE WHEN is_active = 1 AND (status IS NULL OR status = '') THEN 'active' WHEN is_active = 0 AND (status IS NULL OR status = '') THEN 'inactive' ELSE status END"
    );
    await dbPool.query('UPDATE suppliers SET join_date = COALESCE(join_date, created_at)');
  }

  // Eliminar FKs hacia users en cash_sessions para permitir IDs de localStorage
  if (await tableExists('cash_sessions')) {
    await dropFkIfExists('cash_sessions', 'fk_cash_open_user');
    await dropFkIfExists('cash_sessions', 'fk_cash_close_user');
  }

  // El front usa auth local, no usuarios persistidos en DB.
  // Evita errores de FK en tablas operativas que referencian users(id).
  await dropAllFksReferencingUsers();
}