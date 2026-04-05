/**
 * Cash Register / Caja Module
 * Manages cash sessions, opening/closing, and money flow
 */

export interface CashMovement {
  id: string;
  type: 'entrada' | 'salida' | 'gasto' | 'ingreso'; // entrada=venta, salida=refund, gasto=expense, ingreso=other income
  amount: number;
  reason: string;
  reference: string; // Order ID, expense note, etc.
  timestamp: Date;
}

export interface CashSession {
  id: string;
  sessionNumber: string;
  openedBy: string; // User ID who opened
  closedBy?: string; // User ID who closed
  openingAmount: number; // Initial cash
  openedAt: Date;
  closedAt?: Date; // Null if still open
  movements: CashMovement[];
  notes?: string;
  status: 'open' | 'closed';
}

// Helper to calculate session totals
export function calculateSessionTotals(session: CashSession) {
  const sales = session.movements
    .filter((m) => m.type === 'entrada')
    .reduce((sum, m) => sum + m.amount, 0);

  const refunds = session.movements
    .filter((m) => m.type === 'salida')
    .reduce((sum, m) => sum + m.amount, 0);

  const expenses = session.movements
    .filter((m) => m.type === 'gasto')
    .reduce((sum, m) => sum + m.amount, 0);

  const otherIncome = session.movements
    .filter((m) => m.type === 'ingreso')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCash = session.openingAmount + sales - refunds + otherIncome - expenses;
  const difference = 0; // Will be set when actual cash is entered during close

  return {
    totalSales: sales,
    totalRefunds: refunds,
    totalExpenses: expenses,
    otherIncome,
    expectedCash,
    difference,
    netFlow: sales - refunds - expenses + otherIncome,
  };
}

// Default empty session for initialization
export const defaultSessions: CashSession[] = [];
