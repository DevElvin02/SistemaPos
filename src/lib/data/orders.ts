export type OrderStatus =
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export function normalizeOrderStatus(status: unknown): OrderStatus {
  const value = String(status ?? '').toLowerCase();

  if (value === 'paid' || value === 'completed') return 'delivered';
  if (value === 'cancelled') return 'cancelled';
  if (value === 'returned') return 'returned';
  if (value === 'refunded') return 'refunded';
  if (value === 'processing' || value === 'shipped' || value === 'delivered' || value === 'pending') {
    return 'delivered';
  }

  return 'delivered';
}

export function isInventoryReversalStatus(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'cancelled' || normalized === 'returned' || normalized === 'refunded';
}

export function canCancelOrder(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized !== 'delivered' && !isInventoryReversalStatus(normalized);
}

export function canReturnOrder(status: unknown): boolean {
  return normalizeOrderStatus(status) === 'delivered';
}

export function canRefundOrder(status: unknown): boolean {
  return normalizeOrderStatus(status) === 'delivered';
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: OrderStatus;
  items: number;
  date: Date;
}

export const orders: Order[] = [
  
];
