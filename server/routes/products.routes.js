import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

async function resolveCategoryId(conn, categoryName) {
  if (!categoryName) return null;
  try {
    const [rows] = await conn.query(
      'SELECT id FROM categories WHERE name = ? LIMIT 1',
      [categoryName]
    );
    if (rows.length > 0) return rows[0].id;
    const [result] = await conn.query(
      'INSERT INTO categories (name) VALUES (?)',
      [categoryName]
    );
    return result.insertId;
  } catch {
    return null;
  }
}

// ─── GET /api/products ───────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT p.id, p.sku, p.barcode, p.name, p.description,
              p.sale_price, p.cost_price, p.status, p.created_at,
              c.name AS category_name,
              i.quantity, i.min_level
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       ORDER BY p.id DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/products ──────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, sku, barcode, category, cost_price, sale_price, stock, min_stock, status } = req.body;

    if (!name || !sku || sale_price == null) {
      return res.status(400).json({ ok: false, error: 'name, sku y sale_price son obligatorios' });
    }

    const categoryId = await resolveCategoryId(conn, category);

    const [productResult] = await conn.query(
      `INSERT INTO products (category_id, sku, barcode, name, cost_price, sale_price, status, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [categoryId, sku, barcode || null, name, cost_price ?? 0, sale_price, status ?? 'active']
    );

    const productId = productResult.insertId;

    await conn.query(
      `INSERT INTO inventory (product_id, quantity, min_level) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), min_level = VALUES(min_level)`,
      [productId, stock ?? 0, min_stock ?? 0]
    );

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT p.id, p.sku, p.barcode, p.name, p.description,
              p.sale_price, p.cost_price, p.status, p.created_at,
              c.name AS category_name,
              i.quantity, i.min_level
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ?`,
      [productId]
    );

    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

// ─── PUT /api/products/:id ───────────────────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { name, sku, barcode, category, cost_price, sale_price, stock, min_stock, status } = req.body;

    const categoryId = await resolveCategoryId(conn, category);

    await conn.query(
      `UPDATE products SET category_id=?, sku=?, barcode=?, name=?, cost_price=?, sale_price=?, status=?, updated_at=NOW()
       WHERE id=?`,
      [categoryId, sku, barcode || null, name, cost_price ?? 0, sale_price, status ?? 'active', id]
    );

    await conn.query(
      `INSERT INTO inventory (product_id, quantity, min_level) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), min_level = VALUES(min_level)`,
      [id, stock ?? 0, min_stock ?? 0]
    );

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT p.id, p.sku, p.barcode, p.name, p.description,
              p.sale_price, p.cost_price, p.status, p.created_at,
              c.name AS category_name,
              i.quantity, i.min_level
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ?`,
      [id]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

// ─── DELETE /api/products/:id ────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    await conn.query('DELETE FROM inventory WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM products WHERE id = ?', [id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

export default router;
