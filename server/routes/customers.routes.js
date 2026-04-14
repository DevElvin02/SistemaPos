import { Router } from 'express';
import { dbPool } from '../db/pool.js';
import { isTextOnlyName, isValidPhone, normalizeNameText, normalizePhone } from '../lib/phone.js';

const router = Router();

function mapStatus(value) {
  return value === 'suspended' ? 'suspended' : value === 'inactive' ? 'inactive' : 'active';
}

function normalizeCustomerType(value) {
  return String(value ?? '').trim().toLowerCase() === 'mayorista' ? 'mayorista' : 'minorista';
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT c.id, c.code, c.name, c.email, c.phone, c.company, c.address, c.city, c.country,
              c.customer_type,
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
    const { name, email, phone, company, customerType, address, city, country, status } = req.body || {};
    const normalizedName = normalizeNameText(name);
    const normalizedCompany = normalizeNameText(company);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedName || !email || !normalizedPhone) {
      return res.status(400).json({ ok: false, error: 'name, email y phone son obligatorios' });
    }

    if (!isTextOnlyName(normalizedName)) {
      return res.status(400).json({ ok: false, error: 'El nombre solo puede contener letras y espacios' });
    }

    if (normalizedCompany && !isTextOnlyName(normalizedCompany)) {
      return res.status(400).json({ ok: false, error: 'La empresa solo puede contener letras y espacios' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ ok: false, error: 'El numero de telefono no es valido' });
    }

    const normalizedCustomerType = normalizeCustomerType(customerType);

    const [result] = await dbPool.query(
      `INSERT INTO customers (code, name, email, phone, company, customer_type, address, city, country, is_active, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `CUST-${Date.now()}`,
        normalizedName,
        email,
        normalizedPhone,
        normalizedCompany || null,
        normalizedCustomerType,
        address || 'Sin direccion',
        city || null,
        country || 'El Salvador',
        mapStatus(status) === 'active' ? 1 : 0,
        mapStatus(status),
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT c.id, c.code, c.name, c.email, c.phone, c.company, c.address, c.city, c.country,
              c.customer_type,
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
    const { name, email, phone, company, customerType, address, city, country, status } = req.body || {};
    const normalizedName = normalizeNameText(name);
    const normalizedCompany = normalizeNameText(company);
    const normalizedPhone = normalizePhone(phone);
    const normalizedCustomerType = normalizeCustomerType(customerType);

    if (!normalizedName || !email || !normalizedPhone) {
      return res.status(400).json({ ok: false, error: 'name, email y phone son obligatorios' });
    }

    if (!isTextOnlyName(normalizedName)) {
      return res.status(400).json({ ok: false, error: 'El nombre solo puede contener letras y espacios' });
    }

    if (normalizedCompany && !isTextOnlyName(normalizedCompany)) {
      return res.status(400).json({ ok: false, error: 'La empresa solo puede contener letras y espacios' });
    }

    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ ok: false, error: 'El numero de telefono no es valido' });
    }

    await dbPool.query(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, company = ?, customer_type = ?, address = ?, city = ?, country = ?,
           is_active = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        normalizedName,
        email,
        normalizedPhone,
        normalizedCompany || null,
        normalizedCustomerType,
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
              c.customer_type,
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