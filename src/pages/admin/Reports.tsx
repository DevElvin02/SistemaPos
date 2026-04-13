import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdmin } from '@/context/AdminContext';
import { isInventoryReversalStatus } from '@/lib/data/orders';
import { useCompanySettings } from '@/hooks/use-company-settings';

interface OrderLineLike {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

interface OrderWithLines {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  items: number;
  date: Date | string;
  lines?: OrderLineLike[];
}

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const monthFormatter = new Intl.DateTimeFormat('es-SV', { month: 'short', year: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: '2-digit' });

export default function Reports() {
  const { state } = useAdmin();
  const { companySettings } = useCompanySettings();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const orders = state.orders as unknown as OrderWithLines[];

  const validSales = useMemo(
    () => orders.filter((order) => !isInventoryReversalStatus(order.status)),
    [orders]
  );

  const dailySales = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();

    for (let i = 13; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      map.set(key, 0);
    }

    for (const order of validSales) {
      const dayKey = new Date(order.date).toISOString().slice(0, 10);
      if (map.has(dayKey)) {
        map.set(dayKey, (map.get(dayKey) ?? 0) + order.amount);
      }
    }

    return Array.from(map.entries()).map(([key, total]) => ({
      date: dayFormatter.format(new Date(`${key}T00:00:00`)),
      total,
    }));
  }, [validSales]);

  const monthlySales = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();

    for (let i = 11; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, 0);
    }

    for (const order of validSales) {
      const date = new Date(order.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + order.amount);
      }
    }

    return Array.from(map.entries()).map(([key, total]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        month: monthFormatter.format(new Date(year, month - 1, 1)),
        total,
      };
    });
  }, [validSales]);

  const soldByProduct = useMemo(() => {
    const byProduct = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();

    for (const movement of state.kardex) {
      if (movement.type !== 'salida') continue;

      const existing = byProduct.get(movement.productId) ?? {
        productId: movement.productId,
        productName: movement.productName,
        quantity: 0,
        revenue: 0,
      };

      existing.quantity += movement.quantity;
      byProduct.set(movement.productId, existing);
    }

    for (const order of validSales) {
      for (const line of order.lines ?? []) {
        const key = line.productId;
        const existing = byProduct.get(key) ?? {
          productId: key,
          productName: line.productName,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += line.quantity ?? 0;
        existing.revenue += line.subtotal ?? ((line.unitPrice ?? 0) * (line.quantity ?? 0));
        byProduct.set(key, existing);
      }
    }

    return Array.from(byProduct.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [state.kardex, validSales]);

  const financialSummary = useMemo(() => {
    const salesRevenue = validSales.reduce((acc, order) => acc + order.amount, 0);
    const purchaseCost = state.purchases.reduce((acc, purchase) => acc + purchase.amount, 0);

    const costByProduct = new Map<string, { qty: number; total: number }>();
    for (const purchase of state.purchases) {
      for (const line of purchase.lines) {
        const existing = costByProduct.get(line.productId) ?? { qty: 0, total: 0 };
        existing.qty += line.quantity;
        existing.total += line.subtotal;
        costByProduct.set(line.productId, existing);
      }
    }

    const soldQtyByProduct = new Map<string, number>();
    for (const movement of state.kardex) {
      if (movement.type !== 'salida') continue;
      soldQtyByProduct.set(movement.productId, (soldQtyByProduct.get(movement.productId) ?? 0) + movement.quantity);
    }

    let estimatedCostOfGoods = 0;
    for (const [productId, qtySold] of soldQtyByProduct.entries()) {
      const purchased = costByProduct.get(productId);
      const product = state.products.find((item) => item.id === productId);
      const unitCost = purchased && purchased.qty > 0
        ? purchased.total / purchased.qty
        : product?.cost ?? 0;
      estimatedCostOfGoods += unitCost * qtySold;
    }

    const grossProfit = salesRevenue - estimatedCostOfGoods;
    const netCashFlow = salesRevenue - purchaseCost;
    const grossMargin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

    return {
      salesRevenue,
      purchaseCost,
      estimatedCostOfGoods,
      grossProfit,
      netCashFlow,
      grossMargin,
    };
  }, [state.kardex, state.products, state.purchases, validSales]);

  const lowInventory = useMemo(
    () => state.inventory.filter((item) => item.status === 'low' || item.status === 'critical'),
    [state.inventory]
  );

  const salesHistory = useMemo(
    () => [...validSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [validSales]
  );

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const maxWidth = pageWidth - marginX * 2;
      const lineHeight = 6;
      let y = 16;

      const ensureSpace = (requiredHeight = 12) => {
        if (y + requiredHeight <= pageHeight - 16) return;
        doc.addPage();
        y = 16;
      };

      const writeSectionTitle = (title: string) => {
        ensureSpace(12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, marginX, y);
        y += 7;
      };

      const writeRow = (label: string, value: string) => {
        ensureSpace(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(label, marginX, y);
        doc.text(value, pageWidth - marginX, y, { align: 'right' });
        y += lineHeight;
      };

      const writeTable = (title: string, headers: string[], rows: string[][]) => {
        writeSectionTitle(title);
        ensureSpace(10);

        const colWidth = maxWidth / headers.length;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        headers.forEach((header, index) => {
          doc.text(header, marginX + index * colWidth, y);
        });

        y += 5;
        doc.setDrawColor(210, 214, 220);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        rows.forEach((row) => {
          ensureSpace(8);
          row.forEach((cell, index) => {
            const text = doc.splitTextToSize(cell, colWidth - 2);
            doc.text(text, marginX + index * colWidth, y);
          });
          y += 6;
        });

        y += 4;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(companySettings.companyName || 'MOTOREPUESTOS', marginX, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Reporte gerencial', marginX, y);
      y += 5;
      doc.setFontSize(9);
      doc.text(`Generado: ${new Date().toLocaleString('es-SV')}`, marginX, y);
      y += 10;

      writeSectionTitle('Resumen financiero');
      writeRow('Ventas acumuladas', formatCurrency(financialSummary.salesRevenue));
      writeRow('Ganancia bruta estimada', formatCurrency(financialSummary.grossProfit));
      writeRow('Margen bruto', `${financialSummary.grossMargin.toFixed(1)}%`);
      writeRow('Costo de compras', formatCurrency(financialSummary.purchaseCost));
      writeRow('Costo de mercaderia vendida', formatCurrency(financialSummary.estimatedCostOfGoods));
      writeRow('Flujo neto', formatCurrency(financialSummary.netCashFlow));

      writeTable(
        'Ventas diarias (ultimos 14 dias)',
        ['Fecha', 'Total'],
        dailySales.map((item) => [item.date, formatCurrency(item.total)])
      );

      writeTable(
        'Ventas mensuales (ultimos 12 meses)',
        ['Mes', 'Total'],
        monthlySales.map((item) => [item.month, formatCurrency(item.total)])
      );

      writeTable(
        'Productos mas vendidos',
        ['Producto', 'Cantidad', 'Ingreso'],
        soldByProduct.length > 0
          ? soldByProduct.map((item) => [item.productName, String(item.quantity), formatCurrency(item.revenue)])
          : [['Sin datos', '-', '-']]
      );

      writeTable(
        'Inventario bajo',
        ['Producto', 'Actual', 'Minimo', 'Estado'],
        lowInventory.length > 0
          ? lowInventory.map((item) => [item.productName, String(item.quantity), String(item.minLevel), item.status])
          : [['Sin alertas', '-', '-', '-']]
      );

      writeTable(
        'Historial reciente de ventas',
        ['Orden', 'Cliente', 'Monto', 'Estado'],
        salesHistory.slice(0, 12).map((order) => [
          order.orderNumber,
          order.customerName,
          formatCurrency(order.amount),
          order.status,
        ])
      );

      doc.save(`Reporte-Gerencial-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground mt-1">Analisis del negocio en tiempo real</p>
        </div>
        <button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          {isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Ventas acumuladas</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(financialSummary.salesRevenue)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Ganancia bruta estimada</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(financialSummary.grossProfit)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Margen bruto</p>
          <p className="text-2xl font-bold mt-1">{financialSummary.grossMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Inventario bajo</p>
          <p className="text-2xl font-bold mt-1">{lowInventory.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Ventas diarias (ultimos 14 dias)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Ventas mensuales (ultimos 12 meses)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Productos mas vendidos</h2>
          {soldByProduct.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aun no hay datos de ventas por producto.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cantidad</th>
                    <th className="text-right py-2">Ingreso lineas</th>
                  </tr>
                </thead>
                <tbody>
                  {soldByProduct.map((item) => (
                    <tr key={item.productId} className="border-b border-border last:border-b-0">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-right font-medium">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Ganancias</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Ventas (ingresos)</span>
              <span className="font-semibold">{formatCurrency(financialSummary.salesRevenue)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Costo de compras</span>
              <span className="font-semibold">{formatCurrency(financialSummary.purchaseCost)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Costo de mercaderia vendida (estimado)</span>
              <span className="font-semibold">{formatCurrency(financialSummary.estimatedCostOfGoods)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Ganancia bruta estimada</span>
              <span className="font-semibold">{formatCurrency(financialSummary.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Flujo neto (ventas - compras)</span>
              <span className="font-semibold">{formatCurrency(financialSummary.netCashFlow)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Inventario bajo</h2>
          {lowInventory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos en nivel bajo o critico.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Actual</th>
                    <th className="text-right py-2">Minimo</th>
                    <th className="text-left py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lowInventory.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{item.minLevel}</td>
                      <td className="py-2"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Historial de ventas</h2>
          {salesHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Orden</th>
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-right py-2">Items</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-b-0">
                      <td className="py-2">{order.orderNumber}</td>
                      <td className="py-2">{order.customerName}</td>
                      <td className="py-2 text-right">{formatCurrency(order.amount)}</td>
                      <td className="py-2 text-right">{order.items}</td>
                      <td className="py-2"><StatusBadge status={order.status} /></td>
                      <td className="py-2">{new Date(order.date).toLocaleString('es-SV')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
