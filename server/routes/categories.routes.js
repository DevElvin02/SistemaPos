import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, name, description,
              CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END AS status,
              created_at
       FROM categories
       ORDER BY id DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, status } = req.body || {};
    if (!name) {
      return res.status(400).json({ ok: false, error: 'name es obligatorio' });
    }

    const [result] = await dbPool.query(
      'INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)',
      [name, description || null, status === 'inactive' ? 0 : 1]
    );

    const [rows] = await dbPool.query(
      `SELECT id, name, description,
              CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END AS status,
              created_at
       FROM categories WHERE id = ?`,
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
    const { name, description, status } = req.body || {};

    await dbPool.query(
      `UPDATE categories
       SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description || null, status === 'inactive' ? 0 : 1, id]
    );

    const [rows] = await dbPool.query(
      `SELECT id, name, description,
              CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END AS status,
              created_at
       FROM categories WHERE id = ?`,
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
    const [rows] = await dbPool.query('SELECT COUNT(*) AS total FROM products WHERE category_id = ?', [id]);
    if (Number(rows[0]?.total || 0) > 0) {
      return res.status(400).json({ ok: false, error: 'No puedes eliminar una categoria con productos asociados' });
    }
    await dbPool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;