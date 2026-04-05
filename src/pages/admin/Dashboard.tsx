import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  Bell,
  RefreshCw,
  Clock3,
  Lock,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { useAdmin } from '@/context/AdminContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TopProductItem {
  productId: string;
  productName: string;
  units: number;
  revenue: number;
}

export default function Dashboard() {
  const { state } = useAdmin();

  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const validOrders = state.orders.filter((order) => order.status !== 'cancelled');
  const todayOrders = validOrders.filter((order) => isSameDay(new Date(order.date), now));

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdaySales = validOrders
    .filter((order) => isSameDay(new Date(order.date), yesterday))
    .reduce((sum, order) => sum + order.amount, 0);

  const todaySales = todayOrders.reduce((sum, order) => sum + order.amount, 0);
  const salesTrend = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

  const clientsToday = new Set(todayOrders.map((order) => order.customerId)).size;
  const lowStockCount = state.inventory.filter((item) => item.status === 'low' || item.status === 'critical' || item.quantity <= 0).length;

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - i));
    const label = day.toLocaleDateString('es-ES', { weekday: 'short' });

    const value = validOrders
      .filter((order) => isSameDay(new Date(order.date), day))
      .reduce((sum, order) => sum + order.amount, 0);

    return {
      day: label.charAt(0).toUpperCase() + label.slice(1),
      total: Number(value.toFixed(2)),
    };
  });

  const topProductsMap = new Map<string, TopProductItem>();
  state.kardex
    .filter((mov) => mov.type === 'salida')
    .forEach((mov) => {
      const unitPrice = mov.quantity > 0 ? (state.orders.find((o) => o.orderNumber === mov.reference)?.amount ?? 0) / Math.max(1, mov.quantity) : 0;
      const existing = topProductsMap.get(mov.productId);
      if (existing) {
        existing.units += mov.quantity;
        existing.revenue += unitPrice * mov.quantity;
      } else {
        topProductsMap.set(mov.productId, {
          productId: mov.productId,
          productName: mov.productName,
          units: mov.quantity,
          revenue: unitPrice * mov.quantity,
        });
      }
    });

  const topProducts = Array.from(topProductsMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const recentActivity = [
    ...todayOrders.slice(0, 3).map((order) => ({
      id: order.id,
      icon: ShoppingCart,
      title: 'Venta completada',
      detail: `${order.orderNumber} · ${order.customerName}`,
      time: new Date(order.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      amount: `+$${order.amount.toFixed(2)}`,
      status: 'Pagado',
    })),
  ];

  const activeCashSession = state.cashSessions.find((session) => session.status === 'open');
  const cashSales = activeCashSession
    ? activeCashSession.movements
        .filter((mov) => mov.type === 'entrada')
        .reduce((sum, mov) => sum + mov.amount, 0)
    : 0;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-secondary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Ventas del Día"
          value={`$${todaySales.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={{ value: Math.abs(Number(salesTrend.toFixed(1))), label: 'vs ayer', isPositive: salesTrend >= 0 }}
        />
        <StatCard
          title="Órdenes Hoy"
          value={todayOrders.length}
          icon={ShoppingCart}
          trend={{ value: 8.2, label: 'vs ayer', isPositive: true }}
        />
        <StatCard
          title="Clientes Atendidos"
          value={clientsToday}
          icon={Users}
          trend={{ value: 3.5, label: 'vs ayer', isPositive: true }}
        />
        <StatCard
          title="Productos con Stock Bajo"
          value={lowStockCount}
          icon={Package}
          subtitle="Requieren atención"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border/70 p-5 shadow-[0_16px_40px_-28px_rgba(30,41,59,0.45)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[30px] leading-tight font-bold tracking-tight text-secondary">Ventas de los últimos 7 días</h2>
            <span className="text-xs px-3 py-1 rounded-xl bg-muted text-muted-foreground">Esta semana</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Area type="monotone" dataKey="total" stroke="#0D9488" strokeWidth={2.5} fill="url(#salesArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-[0_16px_40px_-28px_rgba(30,41,59,0.45)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">Productos más vendidos</h2>
            <Link to="/reports" className="text-sm text-primary font-semibold">Ver todos</Link>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin datos de ventas para mostrar.</p>
            )}
            {topProducts.map((item, index) => (
              <div key={item.productId} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 bg-muted/25">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-muted-foreground">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-secondary leading-tight">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.units} unidades</p>
                  </div>
                </div>
                <p className="font-bold text-secondary">${item.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border/70 p-5 shadow-[0_16px_40px_-28px_rgba(30,41,59,0.45)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">Actividad reciente</h2>
            <Link to="/orders" className="text-sm text-primary font-semibold">Ver todas</Link>
          </div>

          <div className="space-y-2">
            {recentActivity.length === 0 && (
              <div className="rounded-xl border border-border/60 px-4 py-4 text-sm text-muted-foreground">No hay actividad reciente hoy.</div>
            )}
            {recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-border/60 px-4 py-3 bg-muted/25 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  <p className="font-semibold text-secondary">{activity.amount}</p>
                </div>
                <span className="ml-3 text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-semibold">{activity.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-[0_16px_40px_-28px_rgba(30,41,59,0.45)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">Estado de caja</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${activeCashSession ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {activeCashSession ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Apertura</span>
              <span className="font-semibold text-secondary">
                {activeCashSession
                  ? new Date(activeCashSession.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Fondo inicial</span>
              <span className="font-semibold text-secondary">${activeCashSession?.openingAmount.toFixed(2) ?? '0.00'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Ventas en efectivo</span>
              <span className="font-semibold text-secondary">${cashSales.toFixed(2)}</span>
            </div>
          </div>

          <Link
            to="/cash"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 font-semibold hover:bg-primary/90 transition"
          >
            <Lock className="w-4 h-4" />
            {activeCashSession ? 'Cerrar Caja' : 'Abrir Caja'}
          </Link>

          <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Última actualización: {new Date().toLocaleString('es-ES')}</p>
          <button className="text-xs text-primary font-semibold inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Actualizar</button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/70 px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> Sistema sincronizado correctamente</span>
        <Link to="/alerts" className="text-primary font-semibold">Ir a alertas</Link>
      </div>
    </div>
  );
}
