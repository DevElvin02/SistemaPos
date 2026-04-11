import { useMemo } from 'react';
import { AlertTriangle, BellRing, PackageX, TrendingUp } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { buildAdminNotifications, formatNotificationTime } from '@/lib/admin-notifications';

export default function Alerts() {
  const { state } = useAdmin();

  const outOfStock = useMemo(
    () => state.inventory.filter((item) => item.quantity <= 0 || item.status === 'critical'),
    [state.inventory]
  );

  const lowStock = useMemo(
    () => state.inventory.filter((item) => item.quantity > 0 && (item.status === 'low' || item.quantity <= item.minLevel)),
    [state.inventory]
  );

  const todaySales = useMemo(() => {
    const today = new Date();

    const sameDay = (date: Date) => (
      date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate()
    );

    const sales = state.orders.filter((order) => {
      const orderDate = new Date(order.date);
      return sameDay(orderDate) && order.status !== 'cancelled';
    });

    const total = sales.reduce((sum, sale) => sum + sale.amount, 0);

    return {
      count: sales.length,
      total,
      list: sales,
    };
  }, [state.orders]);

  const notifications = useMemo(
    () => buildAdminNotifications({
      inventory: state.inventory,
      orders: state.orders,
      cashSessions: state.cashSessions,
    }),
    [state.cashSessions, state.inventory, state.orders]
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas</h1>
        <p className="text-muted-foreground mt-1">Monitoreo rapido de inventario, ventas y notificaciones del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
            <PackageX className="w-5 h-5" />
            <span className="font-semibold">Productos Agotados</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{outOfStock.length}</p>
        </div>

        <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 p-4">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Stock Bajo</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{lowStock.length}</p>
        </div>

        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">Ventas Del Dia</span>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">${todaySales.total.toFixed(2)}</p>
          <p className="text-sm text-green-700/80 dark:text-green-300/80">{todaySales.count} ventas</p>
        </div>
      </div>

      <section className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <BellRing className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Centro de notificaciones</h2>
        </div>
        <div className="p-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay notificaciones activas.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatNotificationTime(item.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-red-600 dark:text-red-400">Productos Agotados</h2>
          </div>
          <div className="p-4">
            {outOfStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos agotados.</p>
            ) : (
              <div className="space-y-3">
                {outOfStock.map((item) => (
                  <div key={item.id} className="rounded-md border border-red-200 dark:border-red-900 p-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Existencia: {item.quantity} | Minimo: {item.minLevel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-yellow-600 dark:text-yellow-400">Stock Bajo</h2>
          </div>
          <div className="p-4">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos con stock bajo.</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((item) => (
                  <div key={item.id} className="rounded-md border border-yellow-200 dark:border-yellow-900 p-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Existencia: {item.quantity} | Minimo: {item.minLevel}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Ventas Del Dia</h2>
          <span className="text-sm text-muted-foreground">Total: ${todaySales.total.toFixed(2)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-3 font-semibold">Orden</th>
                <th className="text-left p-3 font-semibold">Cliente</th>
                <th className="text-left p-3 font-semibold">Hora</th>
                <th className="text-right p-3 font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {todaySales.list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">Sin ventas registradas hoy</td>
                </tr>
              ) : (
                todaySales.list.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-b-0">
                    <td className="p-3">{sale.orderNumber}</td>
                    <td className="p-3">{sale.customerName}</td>
                    <td className="p-3">{new Date(sale.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 text-right font-semibold">${sale.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
