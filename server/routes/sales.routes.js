import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

const REVERSAL_STATUSES = new Set(['cancelled', 'returned', 'refunded']);

function normalizeSaleStatus(status) {
  const value = String(status ?? '').toLowerCase();
  if (value === 'paid' || value === 'completed') return 'delivered';
  if (value === 'cancelled' || value === 'returned' || value === 'refunded') return value;
  if (value === 'pending' || value === 'processing' || value === 'shipped' || value === 'delivered') return 'delivered';
  return 'delivered';
}

function canCancelSale(currentStatus) {
  const normalized = normalizeSaleStatus(currentStatus);
  return normalized !== 'delivered' && !REVERSAL_STATUSES.has(normalized);
}

function canReturnOrRefundSale(currentStatus) {
  return normalizeSaleStatus(currentStatus) === 'delivered';
}

function reversalReason(status, saleNumber) {
  if (status === 'cancelled') return `Cancelacion de venta ${saleNumber}`;
  if (status === 'returned') return `Devolucion de venta ${saleNumber}`;
  return `Reembolso de venta ${saleNumber}`;
}

async function restockSaleItems(connection, saleId, saleNumber, userId, targetStatus) {
  const [items] = await connection.query(
    `SELECT si.product_id, si.quantity, i.quantity AS inventory_quantity
     FROM sale_items si
     LEFT JOIN inventory i ON i.product_id = si.product_id
     WHERE si.sale_id = ?
     FOR UPDATE`,
    [saleId]
  );

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity || 0);
    const beforeQty = Number(item.inventory_quantity || 0);
    const afterQty = Number((beforeQty + quantity).toFixed(2));

    await connection.query(
      'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
      [afterQty, productId]
    );

    await connection.query(
      `INSERT INTO inventory_movements
       (product_id, movement_type, quantity, before_qty, after_qty, reason, reference_type, reference_id, created_by)
       VALUES (?, 'entrada', ?, ?, ?, ?, 'sale_reversal', ?, ?)`,
      [productId, quantity, beforeQty, afterQty, reversalReason(targetStatus, saleNumber), saleId, userId || null]
    );
  }
}

async function registerCashReversal(connection, saleId, saleNumber, total, userId, targetStatus) {
  if (targetStatus !== 'cancelled' && targetStatus !== 'refunded') {
    return;
  }

  const [openCashRows] = await connection.query(
    `SELECT id FROM cash_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`
  );

  if (!openCashRows.length) return;

  await connection.query(
    `INSERT INTO cash_movements
     (cash_session_id, movement_type, amount, reason, reference_type, reference_id, created_by)
     VALUES (?, 'salida', ?, ?, 'sale_reversal', ?, ?)`,
    [openCashRows[0].id, total, reversalReason(targetStatus, saleNumber), saleId, userId || null]
  );
}

function isSchemaMissing(error) {
  const code = String(error?.code || '');
  return code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR';
}

async function nextSaleNumber(connection) {
  const [rows] = await connection.query('SELECT MAX(id) AS max_id FROM sales');
  const maxId = Number(rows[0]?.max_id || 0) + 1;
  return `SALE-${String(maxId).padStart(6, '0')}`;
}

async function getSaleById(connection, id) {
  const [sales] = await connection.query(
    `SELECT s.id, s.sale_number, s.customer_id, c.name AS customer_name, u.name AS cashier_name,
            s.sale_date, s.document_type, s.subtotal, s.discount_percent, s.discount_amount, s.tax, s.total, s.status,
            COALESCE(SUM(si.quantity), 0) AS items
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN sale_items si ON si.sale_id = s.id
     WHERE s.id = ?
     GROUP BY s.id, s.sale_number, s.customer_id, c.name, u.name, s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status
     LIMIT 1`,
    [id]
  );

  if (!sales.length) return null;

  const [items] = await connection.query(
    `SELECT si.product_id, COALESCE(p.name, CONCAT('Producto #', si.product_id)) AS product_name,
            si.quantity, si.unit_price, si.discount_percent, si.discount_amount, si.base_total, si.line_total
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id ASC`,
    [id]
  );

  return {
    ...sales[0],
    line_items: items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      baseTotal: Number(item.base_total || (Number(item.quantity || 0) * Number(item.unit_price || 0))),
      discountPercent: Number(item.discount_percent || 0),
      discountAmount: Number(item.discount_amount || 0),
      lineTotal: Number(item.line_total || 0),
    })),
  };
}

async function attachSaleItems(connection, sales) {
  if (!sales.length) return sales;

  const saleIds = sales.map((sale) => sale.id);
  const [items] = await connection.query(
    `SELECT si.sale_id, si.product_id,
            COALESCE(p.name, CONCAT('Producto #', si.product_id)) AS product_name,
            si.quantity, si.unit_price, si.discount_percent, si.discount_amount, si.base_total, si.line_total
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     WHERE si.sale_id IN (?)
     ORDER BY si.sale_id DESC, si.id ASC`,
    [saleIds]
  );

  const itemsBySaleId = new Map();
  for (const item of items) {
    const saleId = Number(item.sale_id);
    if (!itemsBySaleId.has(saleId)) {
      itemsBySaleId.set(saleId, []);
    }

    itemsBySaleId.get(saleId).push({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      baseTotal: Number(item.base_total || (Number(item.quantity || 0) * Number(item.unit_price || 0))),
      discountPercent: Number(item.discount_percent || 0),
      discountAmount: Number(item.discount_amount || 0),
      lineTotal: Number(item.line_total || 0),
    });
  }

  return sales.map((sale) => ({
    ...sale,
    line_items: itemsBySaleId.get(Number(sale.id)) || [],
  }));
}

async function listSales(connection, limit = 200) {
  const [sales] = await connection.query(
    `SELECT s.id, s.sale_number, s.customer_id, c.name AS customer_name, u.name AS cashier_name,
            s.sale_date, s.document_type, s.subtotal, s.discount_percent, s.discount_amount, s.tax, s.total, s.status,
            COALESCE(SUM(si.quantity), 0) AS items
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN sale_items si ON si.sale_id = s.id
     GROUP BY s.id, s.sale_number, s.customer_id, c.name, u.name, s.sale_date, s.document_type, s.subtotal, s.tax, s.total, s.status
     ORDER BY s.id DESC
     LIMIT ?`,
    [limit]
  );

  return attachSaleItems(connection, sales);
}

router.get('/', async (req, res, next) => {
  const connection = await dbPool.getConnection();

  try {
    const rows = await listSales(connection, 200);
    res.json({ ok: true, data: rows });
  } catch (error) {
    if (isSchemaMissing(error)) {
      return res.json({ ok: true, data: [] });
    }
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res, next) => {
  const connection = await dbPool.getConnection();

  try {
    const sale = await getSaleById(connection, req.params.id);

    if (!sale) {
      return res.status(404).json({ ok: false, message: 'Venta no encontrada' });
    }

    res.json({ ok: true, data: sale });
  } catch (error) {
    if (isSchemaMissing(error)) {
      return res.status(404).json({ ok: false, message: 'Venta no encontrada' });
    }

    next(error);
  } finally {
    connection.release();
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
  const effectiveUserId = userId ? Number(userId) : null;

  try {
    await connection.beginTransaction();

    const receivedAmount = Number(Number(amountReceived || 0).toFixed(2));

    let rawSubtotal = 0;
    let totalDiscountAmount = 0;
    for (const item of items) {
      const baseTotal = Number(item.unitPrice) * Number(item.quantity);
      const lineDiscountPercent = Math.min(Math.max(Number(item.discountPercent || 0), 0), 100);
      const lineDiscountAmount = Number((baseTotal * (lineDiscountPercent / 100)).toFixed(2));
      rawSubtotal += baseTotal;
      totalDiscountAmount += lineDiscountAmount;
    }

    const discountAmount = Number(totalDiscountAmount.toFixed(2));
    const subtotal = Number((rawSubtotal - discountAmount).toFixed(2));

    const tax = Number((subtotal * 0.0).toFixed(2)); // Cambia a 0.13 para calcular el IVA (13%)
    const total = Number((subtotal + tax).toFixed(2));

    if (paymentMethod === 'cash' && receivedAmount < total) {
      throw new Error('El monto recibido no cubre el total');
    }

    const saleNumber = await nextSaleNumber(connection);

    const [saleResult] = await connection.query(
      `INSERT INTO sales
       (sale_number, customer_id, user_id, sale_date, document_type, subtotal, discount_percent, discount_amount, tax, total, status, notes)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, 'paid', ?)` ,
      [saleNumber, customerId || null, effectiveUserId, documentType, subtotal, 0, discountAmount, tax, total, notes]
    );

    const saleId = saleResult.insertId;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const baseTotal = Number((quantity * unitPrice).toFixed(2));
      const lineDiscountPercent = Math.min(Math.max(Number(item.discountPercent || 0), 0), 100);
      const lineDiscountAmount = Number((baseTotal * (lineDiscountPercent / 100)).toFixed(2));
      const lineTotal = Number((baseTotal - lineDiscountAmount).toFixed(2));

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
         (sale_id, product_id, quantity, unit_price, discount_percent, discount_amount, base_total, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [saleId, productId, quantity, unitPrice, lineDiscountPercent, lineDiscountAmount, baseTotal, lineTotal]
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
        paymentMethod === 'cash' ? receivedAmount : total,
        paymentMethod === 'cash' ? Number((receivedAmount - total).toFixed(2)) : 0,
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

    const createdSale = await getSaleById(connection, saleId);

    await connection.commit();

    res.status(201).json({
      ok: true,
      data: {
        saleId,
        saleNumber,
        cashierName: createdSale?.cashier_name ?? '',
        subtotal,
        discountPercent: 0,
        discountAmount,
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
  const connection = await dbPool.getConnection();

  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const targetStatus = String(status ?? '').toLowerCase();

    if (!targetStatus) {
      return res.status(400).json({ ok: false, message: 'status es obligatorio' });
    }

    await connection.beginTransaction();

    const [saleRows] = await connection.query(
      `SELECT id, sale_number, total, status
       FROM sales
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (!saleRows.length) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: 'Venta no encontrada' });
    }

    const sale = saleRows[0];
    const currentStatus = normalizeSaleStatus(sale.status);

    if (REVERSAL_STATUSES.has(currentStatus)) {
      await connection.rollback();
      return res.status(400).json({ ok: false, message: `La venta ya fue ${currentStatus} y no se puede revertir otra vez` });
    }

    if (targetStatus === 'cancelled') {
      if (!canCancelSale(sale.status)) {
        await connection.rollback();
        return res.status(400).json({ ok: false, message: 'La venta ya fue entregada. Usa devolución o reembolso en lugar de cancelación.' });
      }

      await restockSaleItems(connection, sale.id, sale.sale_number, null, targetStatus);
      await registerCashReversal(connection, sale.id, sale.sale_number, Number(sale.total || 0), null, targetStatus);
    } else if (targetStatus === 'returned' || targetStatus === 'refunded') {
      if (!canReturnOrRefundSale(sale.status)) {
        await connection.rollback();
        return res.status(400).json({ ok: false, message: 'Solo las ventas entregadas pueden marcarse como devolución o reembolso.' });
      }

      await restockSaleItems(connection, sale.id, sale.sale_number, null, targetStatus);
      await registerCashReversal(connection, sale.id, sale.sale_number, Number(sale.total || 0), null, targetStatus);
    }

    await connection.query(
      'UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetStatus, id]
    );

    const updatedSale = await getSaleById(connection, id);

    await connection.commit();
    res.json({ ok: true, data: updatedSale });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

export default router;
