import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvironment() {
  const candidatePaths = [
    process.env.SUBLIMART_ENV_PATH,
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(process.execPath || ''), '.env'),
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null,
    process.env.ProgramData ? path.join(process.env.ProgramData, 'Sublimart', '.env') : null,
    path.join(path.dirname(process.cwd()), '.env'),
  ].filter(Boolean);

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: false });
    return envPath;
  }

  dotenv.config();
  return null;
}

const loadedEnvPath = loadEnvironment();

function buildSslConfig() {
  if (process.env.DB_SSL !== 'true') {
    return undefined;
  }

  const caPath = process.env.DB_SSL_CA_PATH;
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

  if (!caPath) {
    return { rejectUnauthorized };
  }

  const envBaseDir = loadedEnvPath ? path.dirname(loadedEnvPath) : process.cwd();
  const resolvedCaPath = path.isAbsolute(caPath) ? caPath : path.resolve(envBaseDir, caPath);
  return {
    ca: fs.readFileSync(resolvedCaPath, 'utf8'),
    rejectUnauthorized,
  };
}

const ssl = buildSslConfig();

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Missing environment variable: ${key}. Coloca un archivo .env valido en la carpeta de ejecucion, junto al .exe o en %ProgramData%\\Sublimart\\.env`
    );
  }
}

export const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: 'Z',
  ...(ssl ? { ssl } : {}),
});

export async function pingDatabase() {
  const connection = await dbPool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
