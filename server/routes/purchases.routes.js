import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

async function nextPurchaseNumber(connection) {
  const [rows] = await connection.query('SELECT MAX(id) AS max_id FROM purchases');
  const nextId = Number(rows[0]?.max_id || 0) + 1;
  return `PO-${String(nextId).padStart(6, '0')}`;
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT p.id, p.purchase_number, p.supplier_id, s.name AS supplier_name,
              p.purchase_date, p.total, p.status,
              COALESCE(SUM(pi.quantity), 0) AS items
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
       GROUP BY p.id
       ORDER BY p.id DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { supplierId, userId, purchaseDate, notes = null, lines } = req.body || {};
  if (!supplierId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ ok: false, error: 'supplierId y lines son obligatorios' });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    let subtotal = 0;
    let totalItems = 0;
    for (const line of lines) {
      subtotal += Number(line.unitCost) * Number(line.quantity);
      totalItems += Number(line.quantity);
    }

    const tax = 0;
    const total = Number(subtotal.toFixed(2));
    const purchaseNumber = await nextPurchaseNumber(connection);

    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (purchase_number, supplier_id, user_id, purchase_date, subtotal, tax, total, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [purchaseNumber, supplierId, userId || null, purchaseDate || new Date(), subtotal, tax, total, notes]
    );

    const purchaseId = purchaseResult.insertId;

    for (const line of lines) {
      const productId = Number(line.productId);
      const quantity = Number(line.quantity);
      const unitCost = Number(line.unitCost);
      const lineTotal = Number((quantity * unitCost).toFixed(2));

      await connection.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, productId, quantity, unitCost, lineTotal]
      );

      const [invRows] = await connection.query(
        'SELECT quantity, min_level, max_level, warehouse_location FROM inventory WHERE product_id = ? FOR UPDATE',
        [productId]
      );

      const current = invRows[0];
      const beforeQty = Number(current?.quantity || 0);
      const afterQty = beforeQty + quantity;

      if (current) {
        await connection.query(
          `UPDATE inventory
           SET quantity = ?, last_restocked_at = NOW(), updated_at = CURRENT_TIMESTAMP
           WHERE product_id = ?`,
          [afterQty, productId]
        );
      } else {
        await connection.query(
          `INSERT INTO inventory (product_id, quantity, min_level, max_level, warehouse_location, last_restocked_at)
           VALUES (?, ?, 0, 9999, 'Sin ubicación', NOW())`,
          [productId, quantity]
        );
      }

      await connection.query(
        `INSERT INTO inventory_movements
         (product_id, movement_type, quantity, before_qty, after_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, 'entrada', ?, ?, ?, ?, 'purchase', ?, ?)` ,
        [productId, quantity, beforeQty, afterQty, `Compra ${purchaseNumber}`, purchaseId, userId || null]
      );
    }

    await connection.commit();

    res.status(201).json({
      ok: true,
      data: {
        id: purchaseId,
        purchase_number: purchaseNumber,
        supplier_id: supplierId,
        purchase_date: purchaseDate || new Date(),
        total,
        items: totalItems,
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;