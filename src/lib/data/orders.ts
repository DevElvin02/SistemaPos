export type OrderStatus =
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  baseTotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  lineTotal: number;
}

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

function normalizeOrderLine(line: Record<string, unknown>): OrderLine {
  const quantity = Number(line.quantity ?? 0);
  const unitPrice = Number(line.unitPrice ?? line.unit_price ?? 0);
  const baseTotal = Number(line.baseTotal ?? line.base_total ?? quantity * unitPrice);
  const discountPercent = Number(line.discountPercent ?? line.discount_percent ?? 0);
  const discountAmount = Number(line.discountAmount ?? line.discount_amount ?? 0);
  const lineTotal = Number(line.lineTotal ?? line.line_total ?? (baseTotal - discountAmount));

  return {
    productId: String(line.productId ?? line.product_id ?? ''),
    productName: String(line.productName ?? line.product_name ?? 'Producto'),
    quantity,
    unitPrice,
    baseTotal,
    discountPercent,
    discountAmount,
    lineTotal,
  };
}

export function parseOrderLines(value: unknown): OrderLine[] {
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((line) => normalizeOrderLine(line as Record<string, unknown>)) : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) {
    return value.map((line) => normalizeOrderLine(line as Record<string, unknown>));
  }

  return [];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  cashierName?: string;
  subtotal?: number;
  tax?: number;
  discountPercent?: number;
  discountAmount?: number;
  amount: number;
  status: OrderStatus;
  items: number;
  lines?: OrderLine[];
  date: Date;
}

export const orders: Order[] = [
  
];
