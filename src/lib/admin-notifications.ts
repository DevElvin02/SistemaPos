import type { CashSession } from './data/cash-register';
import type { InventoryItem } from './data/inventory';
import type { Order } from './data/orders';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  href: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  timestamp: number;
}

interface NotificationInput {
  inventory: InventoryItem[];
  orders: Order[];
  cashSessions: CashSession[];
}

function isSameDay(date: Date, base: Date) {
  return (
    date.getFullYear() === base.getFullYear()
    && date.getMonth() === base.getMonth()
    && date.getDate() === base.getDate()
  );
}

function latestTimestamp(values: number[], fallback: number) {
  return values.length > 0 ? Math.max(...values) : fallback;
}

export function formatNotificationTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.max(0, Math.floor(deltaMs / 60000));

  if (deltaMinutes < 1) return 'Hace un momento';
  if (deltaMinutes < 60) return `Hace ${deltaMinutes} min`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `Hace ${deltaHours} h`;

  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `Hace ${deltaDays} d`;

  return new Date(timestamp).toLocaleDateString('es-ES');
}

export function buildAdminNotifications({ inventory, orders, cashSessions }: NotificationInput): AdminNotification[] {
  const now = Date.now();
  const today = new Date();
  const notifications: AdminNotification[] = [];

  const outOfStock = inventory.filter((item) => item.quantity <= 0 || item.status === 'critical');
  if (outOfStock.length > 0) {
    notifications.push({
      id: 'inventory-out-of-stock',
      title: 'Productos agotados',
      message: `${outOfStock.length} producto(s) requieren reposicion inmediata.`,
      href: '/alerts',
      severity: 'critical',
      timestamp: latestTimestamp(outOfStock.map((item) => item.lastRestocked.getTime()), now),
    });
  }

  const lowStock = inventory.filter((item) => item.quantity > 0 && (item.status === 'low' || item.quantity <= item.minLevel));
  if (lowStock.length > 0) {
    notifications.push({
      id: 'inventory-low-stock',
      title: 'Stock bajo',
      message: `${lowStock.length} producto(s) estan por debajo del minimo configurado.`,
      href: '/inventory',
      severity: 'warning',
      timestamp: latestTimestamp(lowStock.map((item) => item.lastRestocked.getTime()), now),
    });
  }

  const pendingOrders = orders.filter((order) => order.status === 'pending' || order.status === 'processing');
  if (pendingOrders.length > 0) {
    notifications.push({
      id: 'orders-pending',
      title: 'Ventas pendientes',
      message: `${pendingOrders.length} venta(s) aun requieren seguimiento.`,
      href: '/orders',
      severity: 'info',
      timestamp: latestTimestamp(pendingOrders.map((order) => new Date(order.date).getTime()), now),
    });
  }

  const todaySales = orders.filter((order) => isSameDay(new Date(order.date), today) && order.status !== 'cancelled');
  if (todaySales.length > 0) {
    const total = todaySales.reduce((sum, order) => sum + order.amount, 0);
    notifications.push({
      id: 'sales-today-summary',
      title: 'Resumen del dia',
      message: `${todaySales.length} venta(s) registradas hoy por $${total.toFixed(2)}.`,
      href: '/reports',
      severity: 'success',
      timestamp: latestTimestamp(todaySales.map((order) => new Date(order.date).getTime()), now),
    });
  }

  const openSession = cashSessions.find((session) => session.status === 'open');
  if (openSession) {
    notifications.push({
      id: 'cash-open-session',
      title: 'Caja abierta',
      message: `La caja ${openSession.sessionNumber} esta abierta con ${openSession.movements.length} movimiento(s).`,
      href: '/cash',
      severity: 'info',
      timestamp: openSession.openedAt.getTime(),
    });
  }

  return notifications.sort((a, b) => b.timestamp - a.timestamp);
}
