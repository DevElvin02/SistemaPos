import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

function isSchemaMissing(error) {
  const code = String(error?.code || '');
  return code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR';
}

async function nextSaleNumber(connection) {
  const [rows] = await connection.query('SELECT MAX(id) AS max_id FROM sales');
  const maxId = Number(rows[0]?.max_id || 0) + 1;
  return `SALE-${String(maxId).padStart(6, '0')}`;
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT s.id, s.sale_number, s.customer_id, c.name AS customer_name,
              s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status,
              COALESCE(SUM(si.quantity), 0) AS items
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       GROUP BY s.id, s.sale_number, s.customer_id, c.name, s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status
       ORDER BY s.id DESC
       LIMIT 200`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    if (isSchemaMissing(error)) {
      return res.json({ ok: true, data: [] });
    }
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const {
    customerId,
    userId,
    documentType = 'ticket',
    paymentMethod = 'cash',
    amountReceived = 0,
    notes = null,
    items,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: 'items es requerido y debe tener al menos un elemento' });
  }

  const connection = await dbPool.getConnection();
  const effectiveUserId = null;

  try {
    await connection.beginTransaction();

    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.unitPrice) * Number(item.quantity);
    }

    const tax = Number((subtotal * 0.13).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    if (paymentMethod === 'cash' && Number(amountReceived) < total) {
      throw new Error('El monto recibido no cubre el total');
    }

    const saleNumber = await nextSaleNumber(connection);

    const [saleResult] = await connection.query(
      `INSERT INTO sales
       (sale_number, customer_id, user_id, sale_date, document_type, subtotal, tax, total, status, notes)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'paid', ?)`,
      [saleNumber, customerId || null, effectiveUserId, documentType, subtotal, tax, total, notes]
    );

    const saleId = saleResult.insertId;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineTotal = Number((quantity * unitPrice).toFixed(2));

      const [invRows] = await connection.query(
        'SELECT quantity FROM inventory WHERE product_id = ? FOR UPDATE',
        [productId]
      );

      if (!invRows.length) {
        throw new Error(`No existe inventario para product_id=${productId}`);
      }

      const beforeQty = Number(invRows[0].quantity);
      const afterQty = Number((beforeQty - quantity).toFixed(2));

      if (afterQty < 0) {
        throw new Error(`Stock insuficiente para product_id=${productId}`);
      }

      await connection.query(
        `INSERT INTO sale_items
         (sale_id, product_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, productId, quantity, unitPrice, lineTotal]
      );

      await connection.query(
        'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [afterQty, productId]
      );

      await connection.query(
        `INSERT INTO inventory_movements
         (product_id, movement_type, quantity, before_qty, after_qty, reason, reference_type, reference_id, created_by)
         VALUES (?, 'salida', ?, ?, ?, ?, 'sale', ?, ?)`,
        [productId, quantity, beforeQty, afterQty, `Venta ${saleNumber}`, saleId, effectiveUserId]
      );
    }

    await connection.query(
      `INSERT INTO sale_payments
       (sale_id, method, amount_received, amount_change, reference)
       VALUES (?, ?, ?, ?, ?)`,
      [
        saleId,
        paymentMethod,
        Number(amountReceived || total),
        paymentMethod === 'cash' ? Number((Number(amountReceived) - total).toFixed(2)) : 0,
        null,
      ]
    );

    const [openCashRows] = await connection.query(
      `SELECT id FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`
    );

    if (openCashRows.length) {
      await connection.query(
        `INSERT INTO cash_movements
         (cash_session_id, movement_type, amount, reason, reference_type, reference_id, created_by)
         VALUES (?, 'entrada', ?, ?, 'sale', ?, ?)`,
        [openCashRows[0].id, total, `Venta ${saleNumber}`, saleId, effectiveUserId]
      );
    }

    await connection.commit();

    res.status(201).json({
      ok: true,
      data: {
        saleId,
        saleNumber,
        subtotal,
        tax,
        total,
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    await dbPool.query(
      'UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    const [rows] = await dbPool.query(
      `SELECT s.id, s.sale_number, s.customer_id, c.name AS customer_name,
              s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status,
              COALESCE(SUM(si.quantity), 0) AS items
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE s.id = ?
       GROUP BY s.id, s.sale_number, s.customer_id, c.name, s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status`,
      [id]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
