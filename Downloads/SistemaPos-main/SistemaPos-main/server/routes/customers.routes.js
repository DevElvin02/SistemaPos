import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

function mapStatus(value) {
  return value === 'suspended' ? 'suspended' : value === 'inactive' ? 'inactive' : 'active';
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT c.id, c.code, c.name, c.email, c.phone, c.company, c.address, c.city, c.country,
              c.status, c.created_at,
              COUNT(s.id) AS total_orders,
              COALESCE(SUM(CASE WHEN s.status <> 'cancelled' THEN s.total ELSE 0 END), 0) AS total_spent
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id
       GROUP BY c.id
       ORDER BY c.id DESC`
    );

    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, company, address, city, country, status } = req.body || {};
    if (!name || !email || !phone) {
      return res.status(400).json({ ok: false, error: 'name, email y phone son obligatorios' });
    }

    const [result] = await dbPool.query(
      `INSERT INTO customers (code, name, email, phone, company, address, city, country, is_active, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `CUST-${Date.now()}`,
        name,
        email,
        phone,
        company || null,
        address || 'Sin direccion',
        city || null,
        country || 'El Salvador',
        mapStatus(status) === 'active' ? 1 : 0,
        mapStatus(status),
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT c.id, c.code, c.name, c.email, c.phone, c.company, c.address, c.city, c.country,
              c.status, c.created_at, 0 AS total_orders, 0 AS total_spent
       FROM customers c
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, address, city, country, status } = req.body || {};

    await dbPool.query(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, company = ?, address = ?, city = ?, country = ?,
           is_active = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        email,
        phone,
        company || null,
        address || 'Sin direccion',
        city || null,
        country || 'El Salvador',
        mapStatus(status) === 'active' ? 1 : 0,
        mapStatus(status),
        id,
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT c.id, c.code, c.name, c.email, c.phone, c.company, c.address, c.city, c.country,
              c.status, c.created_at,
              COUNT(s.id) AS total_orders,
              COALESCE(SUM(CASE WHEN s.status <> 'cancelled' THEN s.total ELSE 0 END), 0) AS total_spent
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [salesRows] = await dbPool.query('SELECT COUNT(*) AS total FROM sales WHERE customer_id = ?', [id]);
    if (Number(salesRows[0]?.total || 0) > 0) {
      return res.status(400).json({ ok: false, error: 'No puedes eliminar un cliente con historial de compras' });
    }

    await dbPool.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;