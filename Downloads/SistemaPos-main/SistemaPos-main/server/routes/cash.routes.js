import { Router } from 'express';
import { dbPool } from '../db/pool.js';

const router = Router();

router.get('/sessions', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT cs.id, cs.session_number, cs.opened_by, cs.opened_at, cs.opening_amount,
              cs.closed_by, cs.closed_at, cs.expected_amount, cs.counted_amount,
              cs.difference_amount, cs.status, cs.notes
       FROM cash_sessions cs
       ORDER BY cs.id DESC
       LIMIT 100`
    );

    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT cm.id, cm.cash_session_id, cm.movement_type, cm.amount, cm.reason,
              cm.reference_type, cm.reference_id, cm.created_by, cm.created_at
       FROM cash_movements cm
       ORDER BY cm.created_at DESC
       LIMIT 300`
    );
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions', async (req, res, next) => {
  try {
    const { userId, openingAmount } = req.body || {};
    const [openRows] = await dbPool.query(`SELECT id FROM cash_sessions WHERE status = 'open' LIMIT 1`);
    if (openRows.length) {
      return res.status(400).json({ ok: false, error: 'Ya existe una caja abierta' });
    }

    const [maxRows] = await dbPool.query('SELECT MAX(id) AS max_id FROM cash_sessions');
    const nextId = Number(maxRows[0]?.max_id || 0) + 1;
    const sessionNumber = `CS-${String(nextId).padStart(6, '0')}`;

    const [result] = await dbPool.query(
      `INSERT INTO cash_sessions (session_number, opened_by, opened_at, opening_amount, status)
       VALUES (?, ?, NOW(), ?, 'open')`,
      [sessionNumber, userId || null, Number(openingAmount || 0)]
    );

    const [rows] = await dbPool.query(
      `SELECT cs.id, cs.session_number, cs.opened_by, cs.opened_at, cs.opening_amount,
              cs.closed_by, cs.closed_at, cs.expected_amount, cs.counted_amount,
              cs.difference_amount, cs.status, cs.notes
       FROM cash_sessions cs
       WHERE cs.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/movements', async (req, res, next) => {
  try {
    const { sessionId, movementType, amount, reason, reference, userId } = req.body || {};
    const [result] = await dbPool.query(
      `INSERT INTO cash_movements
       (cash_session_id, movement_type, amount, reason, reference_type, reference_id, created_by)
       VALUES (?, ?, ?, ?, 'manual', NULL, ?)`,
      [sessionId, movementType, amount, reference || reason, userId || null]
    );

    const [rows] = await dbPool.query(
      `SELECT cm.id, cm.cash_session_id, cm.movement_type, cm.amount, cm.reason,
              cm.reference_type, cm.reference_id, cm.created_by, cm.created_at
       FROM cash_movements cm WHERE cm.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, actualCash, notes } = req.body || {};

    const [sessionRows] = await dbPool.query(
      `SELECT id, opening_amount FROM cash_sessions WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!sessionRows.length) {
      return res.status(404).json({ ok: false, error: 'Sesion no encontrada' });
    }

    const openingAmount = Number(sessionRows[0].opening_amount || 0);
    const [movementRows] = await dbPool.query(
      `SELECT movement_type, amount FROM cash_movements WHERE cash_session_id = ?`,
      [id]
    );

    let expectedAmount = openingAmount;
    for (const movement of movementRows) {
      const value = Number(movement.amount || 0);
      if (movement.movement_type === 'entrada' || movement.movement_type === 'ingreso') {
        expectedAmount += value;
      } else {
        expectedAmount -= value;
      }
    }

    const countedAmount = Number(actualCash || 0);
    const differenceAmount = Number((countedAmount - expectedAmount).toFixed(2));

    await dbPool.query(
      `UPDATE cash_sessions
       SET closed_by = ?, closed_at = NOW(), expected_amount = ?, counted_amount = ?, difference_amount = ?,
           status = 'closed', notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId || null, expectedAmount, countedAmount, differenceAmount, notes || null, id]
    );

    const [rows] = await dbPool.query(
      `SELECT cs.id, cs.session_number, cs.opened_by, cs.opened_at, cs.opening_amount,
              cs.closed_by, cs.closed_at, cs.expected_amount, cs.counted_amount,
              cs.difference_amount, cs.status, cs.notes
       FROM cash_sessions cs
       WHERE cs.id = ?`,
      [id]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
