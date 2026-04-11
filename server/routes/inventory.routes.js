import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT i.product_id, p.name AS product_name, p.sku,
              i.quantity, i.min_level, i.max_level, i.warehouse_location,
              i.last_restocked_at, i.updated_at
       FROM inventory i
       INNER JOIN products p ON p.id = i.product_id
       ORDER BY p.name ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT km.id, km.product_id, p.name AS product_name, km.movement_type,
              km.quantity, km.before_qty, km.after_qty, km.reason, km.reference_type,
              km.reference_id, km.created_at
       FROM inventory_movements km
       INNER JOIN products p ON p.id = km.product_id
       ORDER BY km.created_at DESC
       LIMIT 300`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, minLevel, maxLevel, warehouseLocation } = req.body || {};

    await dbPool.query(
      `UPDATE inventory
       SET quantity = COALESCE(?, quantity),
           min_level = COALESCE(?, min_level),
           max_level = COALESCE(?, max_level),
           warehouse_location = COALESCE(?, warehouse_location),
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = ?`,
      [quantity ?? null, minLevel ?? null, maxLevel ?? null, warehouseLocation ?? null, productId]
    );

    const [rows] = await dbPool.query(
      `SELECT i.product_id, p.name AS product_name, p.sku,
              i.quantity, i.min_level, i.max_level, i.warehouse_location,
              i.last_restocked_at, i.updated_at
       FROM inventory i
       INNER JOIN products p ON p.id = i.product_id
       WHERE i.product_id = ?`,
      [productId]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/movements', async (req, res, next) => {
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    const { productId, type, quantity, reason, reference, userId } = req.body || {};

    const [inventoryRows] = await connection.query(
      'SELECT quantity, min_level, max_level, warehouse_location FROM inventory WHERE product_id = ? FOR UPDATE',
      [productId]
    );

    if (!inventoryRows.length) {
      throw new Error('Producto no encontrado en inventario');
    }

    const current = inventoryRows[0];
    const beforeQty = Number(current.quantity || 0);
    const changeQty = Number(quantity || 0);
    const afterQty = type === 'entrada' ? beforeQty + changeQty : beforeQty - changeQty;

    if (afterQty < 0) {
      throw new Error('No hay stock suficiente para la salida');
    }

    await connection.query(
      `UPDATE inventory
       SET quantity = ?,
           last_restocked_at = CASE WHEN ? = 'entrada' THEN NOW() ELSE last_restocked_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = ?`,
      [afterQty, type, productId]
    );

    const [movementResult] = await connection.query(
      `INSERT INTO inventory_movements
       (product_id, movement_type, quantity, before_qty, after_qty, reason, reference_type, reference_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', NULL, ?)`,
      [productId, type, changeQty, beforeQty, afterQty, reference || reason || 'Movimiento manual', userId || null]
    );

    await connection.commit();
    res.status(201).json({ ok: true, data: { id: movementResult.insertId, productId, type, quantity: changeQty, beforeQty, afterQty, reason, reference } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
