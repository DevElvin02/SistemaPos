import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

function parseProductsSold(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, code, name, contact_name, phone, email, website, address, city, country,
              status, products_sold, total_orders, rating, payment_terms, join_date
       FROM suppliers
       ORDER BY id DESC`
    );
    res.json({ ok: true, data: rows.map((row) => ({ ...row, products_sold: parseProductsSold(row.products_sold) })) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, contact, productsSold, status, email, phone, website, address, city, country, paymentTerms } = req.body || {};
    if (!name || !contact) {
      return res.status(400).json({ ok: false, error: 'name y contact son obligatorios' });
    }

    const [result] = await dbPool.query(
      `INSERT INTO suppliers
       (code, name, contact_name, phone, email, website, address, city, country, is_active, status, products_sold, total_orders, rating, payment_terms, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW())`,
      [
        `SUP-${Date.now()}`,
        name,
        contact,
        phone || contact,
        email || null,
        website || null,
        address || 'No especificada',
        city || 'No especificada',
        country || 'El Salvador',
        status === 'active' ? 1 : 0,
        status || 'active',
        JSON.stringify(productsSold || []),
        paymentTerms || 'Por definir',
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT id, code, name, contact_name, phone, email, website, address, city, country,
              status, products_sold, total_orders, rating, payment_terms, join_date
       FROM suppliers WHERE id = ?`,
      [result.insertId]
    );
    const row = rows[0];
    res.status(201).json({ ok: true, data: { ...row, products_sold: parseProductsSold(row.products_sold) } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact, productsSold, status, email, phone, website, address, city, country, totalOrders, rating, paymentTerms } = req.body || {};

    await dbPool.query(
      `UPDATE suppliers
       SET name = ?, contact_name = ?, phone = ?, email = ?, website = ?, address = ?, city = ?, country = ?,
           is_active = ?, status = ?, products_sold = ?, total_orders = ?, rating = ?, payment_terms = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        contact,
        phone || contact,
        email || null,
        website || null,
        address || 'No especificada',
        city || 'No especificada',
        country || 'El Salvador',
        status === 'active' ? 1 : 0,
        status || 'active',
        JSON.stringify(productsSold || []),
        totalOrders || 0,
        rating || 0,
        paymentTerms || 'Por definir',
        id,
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT id, code, name, contact_name, phone, email, website, address, city, country,
              status, products_sold, total_orders, rating, payment_terms, join_date
       FROM suppliers WHERE id = ?`,
      [id]
    );
    const row = rows[0];
    res.json({ ok: true, data: { ...row, products_sold: parseProductsSold(row.products_sold) } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await dbPool.query('SELECT COUNT(*) AS total FROM purchases WHERE supplier_id = ?', [id]);
    if (Number(rows[0]?.total || 0) > 0) {
      return res.status(400).json({ ok: false, error: 'No puedes eliminar un proveedor con compras registradas' });
    }
    await dbPool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;