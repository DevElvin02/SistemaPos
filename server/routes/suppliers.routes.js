import { Router } from 'express';
import { dbPool } from '../db/pool.js';
import { isTextOnlyName, isValidPhone, normalizeNameText, normalizePhone } from '../lib/phone.js';

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
    const normalizedName = normalizeNameText(name);
    const normalizedPhone = normalizePhone(phone);
    const resolvedPhone = normalizedPhone && isValidPhone(normalizedPhone)
      ? normalizedPhone
      : (isValidPhone(contact) ? normalizePhone(contact) : null);
    if (!normalizedName || !contact) {
      return res.status(400).json({ ok: false, error: 'name y contact son obligatorios' });
    }

    if (!isTextOnlyName(normalizedName)) {
      return res.status(400).json({ ok: false, error: 'El nombre solo puede contener letras y espacios' });
    }

    if (phone && normalizedPhone && !isValidPhone(normalizedPhone)) {
      return res.status(400).json({ ok: false, error: 'El numero de telefono del proveedor no es valido' });
    }

    const [result] = await dbPool.query(
      `INSERT INTO suppliers
       (code, name, contact_name, phone, email, website, address, city, country, is_active, status, products_sold, total_orders, rating, payment_terms, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW())`,
      [
        `SUP-${Date.now()}`,
        normalizedName,
        contact,
        resolvedPhone,
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
    const normalizedName = normalizeNameText(name);
    const normalizedPhone = normalizePhone(phone);
    const resolvedPhone = normalizedPhone && isValidPhone(normalizedPhone)
      ? normalizedPhone
      : (isValidPhone(contact) ? normalizePhone(contact) : null);

    if (phone && normalizedPhone && !isValidPhone(normalizedPhone)) {
      return res.status(400).json({ ok: false, error: 'El numero de telefono del proveedor no es valido' });
    }

    if (!normalizedName || !contact) {
      return res.status(400).json({ ok: false, error: 'name y contact son obligatorios' });
    }

    if (!isTextOnlyName(normalizedName)) {
      return res.status(400).json({ ok: false, error: 'El nombre solo puede contener letras y espacios' });
    }

    await dbPool.query(
      `UPDATE suppliers
       SET name = ?, contact_name = ?, phone = ?, email = ?, website = ?, address = ?, city = ?, country = ?,
           is_active = ?, status = ?, products_sold = ?, total_orders = ?, rating = ?, payment_terms = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        normalizedName,
        contact,
        resolvedPhone,
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