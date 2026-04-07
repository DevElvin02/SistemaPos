import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import productsRoutes from './routes/products.routes.js';
import customersRoutes from './routes/customers.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salesRoutes from './routes/sales.routes.js';
import purchasesRoutes from './routes/purchases.routes.js';
import cashRoutes from './routes/cash.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import { bootstrapSchema } from './db/bootstrap.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
let serverStartPromise;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const hasBuiltFrontend = fs.existsSync(path.join(distPath, 'index.html'));

function parseAllowedOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);

app.set('trust proxy', 1);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  if (hasBuiltFrontend) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }

  res.json({ ok: true, message: 'Sublimart API running' });
});

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    message: 'Sublimart API endpoint base',
    health: '/api/health',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

if (hasBuiltFrontend) {
  app.use(express.static(distPath));

  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export function startApi() {
  if (!serverStartPromise) {
    serverStartPromise = bootstrapSchema()
      .then(() => new Promise((resolve, reject) => {
        const server = app.listen(PORT, () => {
          console.log(`[API] running on http://localhost:${PORT}`);
          resolve(server);
        });

        server.on('error', (error) => {
          reject(error);
        });
      }));
  }

  return serverStartPromise;
}

const entryFilePath = process.argv[1] ? fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, '/')}`)) : '';
const isDirectRun = entryFilePath === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startApi().catch((error) => {
    console.error('[API] bootstrap failed', error);
    process.exit(1);
  });
}
