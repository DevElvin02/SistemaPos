import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { OrderDetailModal } from '@/components/admin/OrderModals';
import { OrderActionButtons } from '@/components/admin/OrderActionButtons';
import { CreateOrderModal } from '@/components/admin/CreateOrderModal';
import { Order, canCancelOrder, canRefundOrder, canReturnOrder, getOrderStatusLabel, isInventoryReversalStatus, normalizeOrderStatus, parseOrderLines } from '@/lib/data/orders';
import {
  generateInvoiceHTML,
  downloadDocument,
  printPlainTextReceipt,
  generateTicketPDF,
} from '@/lib/utils/invoice-generator';
import { showToast } from '@/lib/swal';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useCompanySettings } from '@/hooks/use-company-settings';

interface SaleLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  baseTotal?: number;
  discountAmount?: number;
  discountPercent?: number;
}

function mapSaleRowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id ?? ''),
    orderNumber: String(row.sale_number ?? row.orderNumber ?? ''),
    customerId: String(row.customer_id ?? row.customerId ?? ''),
    customerName: String(row.customer_name ?? row.customerName ?? 'Consumidor final'),
    cashierName: String(row.cashier_name ?? row.cashierName ?? ''),
    payment: {
      method: String(row.payment_method ?? row.paymentMethod ?? 'cash'),
      received: Number(row.amount_received ?? row.amountReceived ?? row.total ?? row.amount ?? 0),
      change: Number(row.amount_change ?? row.amountChange ?? 0),
    },
    subtotal: Number(row.subtotal ?? 0),
    tax: Number(row.tax ?? 0),
    discountPercent: Number(row.discount_percent ?? row.discountPercent ?? 0),
    discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
    amount: Number(row.total ?? row.amount ?? 0),
    items: Number(row.items ?? 0),
    lines: parseOrderLines(row.line_items ?? row.lines),
    status: normalizeOrderStatus(row.status),
    date: row.sale_date ? new Date(String(row.sale_date)) : new Date(),
  };
}

export default function Orders() {
  const { state, dispatch } = useAdmin();
  const { user } = useAuth();
  const { companySettings } = useCompanySettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);

  const loadOrders = async (source: string) => {
    setIsLoadingOrders(true);

    try {
      const rows = await apiRequest<Record<string, unknown>[]>('/sales');
      const mappedOrders = rows.map(mapSaleRowToOrder);

      dispatch({ type: 'SET_ORDERS', payload: mappedOrders });
      setOrdersError(null);
    } catch (error) {
      console.error(`[Orders] ${source} fetch /sales failed`, error);
      setOrdersError(error instanceof Error ? error.message : 'No se pudieron cargar las ventas');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadOrders('initial-load');
  }, []);

  const filteredOrders = state.orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm)
  );

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const target = state.orders.find((order) => order.id === orderId);
    if (!target) return;

    try {
      const data = await apiRequest<Record<string, unknown>>(`/sales/${orderId}/status`, {
        method: 'PATCH',
        body: { status },
      });

      dispatch({
        type: 'UPDATE_ORDER',
        payload: {
          ...target,
          ...mapSaleRowToOrder(data),
        },
      });

      await loadOrders(`after-${status}`);
      showToast(`Venta ${target.orderNumber} actualizada a ${getOrderStatusLabel(status)}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : `No se pudo actualizar la venta a ${getOrderStatusLabel(status)}`, 'error');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const loadOrderDetail = async (orderId: string) => {
    const row = await apiRequest<Record<string, unknown>>(`/sales/${orderId}`);
    const detailedOrder = mapSaleRowToOrder(row);

    dispatch({ type: 'UPDATE_ORDER', payload: detailedOrder });
    return detailedOrder;
  };

  const ensureOrderDetail = async (order: Order) => {
    if (order.lines && order.lines.length > 0) {
      return order;
    }

    return loadOrderDetail(order.id);
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);

    if (order.lines && order.lines.length > 0) {
      return;
    }

    try {
      setIsLoadingOrderDetail(true);
      const detailedOrder = await ensureOrderDetail(order);
      setSelectedOrder(detailedOrder);
    } catch (error) {
      console.warn('[Orders] No se pudo enriquecer el detalle de la venta', error);
    } finally {
      setIsLoadingOrderDetail(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelled');
  };

  const handleReturnOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'returned');
  };

  const handleRefundOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'refunded');
  };

  const getCustomerEmail = (order: Order) => {
    const customer = state.customers.find((c) => c.id === order.customerId);
    return customer?.email || 'cliente@motorepuestos.com';
  };

  const getInvoiceData = (order: Order) => ({
    order,
    customerName: order.customerName,
    customerEmail: getCustomerEmail(order),
    cashierName: order.cashierName || user?.name || 'Cajero no disponible',
    companyName: companySettings.companyName,
    companyAddress: companySettings.address,
    companyEmail: companySettings.email,
    companyPhone: companySettings.phone,
    companyCountry: companySettings.country,
    invoiceDate: new Date().toLocaleDateString('es-ES'),
  });

  const handleGenerateInvoice = async (order: Order) => {
    if (isInventoryReversalStatus(order.status)) {
      showToast('No se puede facturar una venta revertida', 'error');
      return;
    }

    try {
      let detailedOrder = order;

      try {
        detailedOrder = await ensureOrderDetail(order);
      } catch (error) {
        console.warn('[Orders] Factura sin detalle enriquecido', error);
      }

      const invoiceHTML = generateInvoiceHTML(getInvoiceData(detailedOrder));
      downloadDocument(invoiceHTML, `Comprobante-${order.orderNumber}.html`);
      showToast(`Comprobante generado para ${order.orderNumber}`, 'success');
    } catch {
      showToast('No se pudo generar el comprobante', 'error');
    }
  };

  const handlePrintTicket = async (order: Order) => {
    if (isInventoryReversalStatus(order.status)) {
      showToast('No se puede imprimir ticket de una venta revertida', 'error');
      return;
    }

    try {
      let detailedOrder = order;

      try {
        detailedOrder = await ensureOrderDetail(order);
      } catch (error) {
        console.warn('[Orders] Ticket sin detalle enriquecido', error);
      }

      printPlainTextReceipt(getInvoiceData(detailedOrder));
      showToast(`Ticket enviado a impresion: ${order.orderNumber}`, 'success');
    } catch {
      showToast('No se pudo imprimir el ticket', 'error');
    }
  };

  const handleGeneratePdf = async (order: Order) => {
    if (isInventoryReversalStatus(order.status)) {
      showToast('No se puede generar PDF de una venta revertida', 'error');
      return;
    }

    try {
      let detailedOrder = order;

      try {
        detailedOrder = await ensureOrderDetail(order);
      } catch (error) {
        console.warn('[Orders] PDF sin detalle enriquecido', error);
      }

      await generateTicketPDF(getInvoiceData(detailedOrder), `Ticket-${order.orderNumber}.pdf`);
      showToast(`PDF generado para ${order.orderNumber}`, 'success');
    } catch {
      showToast('No se pudo generar el PDF', 'error');
    }
  };

  const handleSendInvoiceEmail = async (order: Order) => {
    if (isInventoryReversalStatus(order.status)) {
      showToast('No se puede enviar factura por correo para una venta revertida', 'error');
      return;
    }

    if (order.invoiceEmailSentAt) {
      const sentDate = order.invoiceEmailSentAt.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      showToast(`La factura electrónica ya fue enviada el ${sentDate}`, 'error');
      return;
    }

    const customer = state.customers.find((item) => item.id === order.customerId);
    if (!customer?.email?.trim()) {
      showToast('El cliente no tiene un correo registrado', 'error');
      return;
    }

    try {
      const data = await apiRequest<Record<string, unknown>>(`/sales/${order.id}/send-invoice-email`, {
        method: 'POST',
      });

      const mode = String(data.mode ?? 'resend');
      if (mode === 'preview') {
        showToast(`Factura preparada en modo preview para ${customer.email}`, 'success');
        return;
      }

      showToast(`Factura enviada por correo a ${customer.email}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo enviar la factura por correo', 'error');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleCreateOrder = async (newOrder: any) => {
    const saleLines = (newOrder.lines ?? []) as SaleLine[];

    for (const line of saleLines) {
      const inventoryItem = state.inventory.find((item) => item.productId === line.productId);
      if (!inventoryItem) {
        showToast(`No existe inventario para ${line.productName}`, 'error');
        return false;
      }

      if (line.quantity > inventoryItem.quantity) {
        showToast(`Stock insuficiente para ${line.productName}. Disponible: ${inventoryItem.quantity}`, 'error');
        return false;
      }
    }

    try {
      const data = await apiRequest<Record<string, unknown>>('/sales', {
        method: 'POST',
        body: {
          customerId: Number(newOrder.customerId),
          userId: user?.id ? Number(user.id) : null,
          documentType: newOrder.documentType,
          paymentMethod: newOrder.payment.method,
          amountReceived: newOrder.payment.received,
          items: saleLines.map((line) => {
            return {
              productId: Number(line.productId),
              quantity: line.quantity,
              unitPrice: Number(line.unitPrice ?? 0),
              discountPercent: Number(line.discountPercent ?? 0),
            };
          }),
        },
      });

      const orderWithDefaults: Order = {
        id: String(data.saleId ?? newOrder.id),
        orderNumber: String(data.saleNumber ?? newOrder.orderNumber),
        customerId: newOrder.customerId,
        customerName: newOrder.customerName,
        cashierName: String(data.cashierName ?? newOrder.cashierName ?? user?.name ?? ''),
        payment: {
          method: String(data.paymentMethod ?? newOrder.payment.method ?? 'cash'),
          received: Number(data.amountReceived ?? newOrder.payment.received ?? 0),
          change: Number(data.amountChange ?? newOrder.payment.change ?? 0),
        },
        subtotal: Number(data.subtotal ?? newOrder.subtotal),
        tax: Number(data.tax ?? newOrder.tax),
        discountPercent: Number(data.discountPercent ?? newOrder.discountPercent ?? 0),
        discountAmount: Number(data.discountAmount ?? newOrder.discountAmount ?? 0),
        amount: Number(data.total ?? newOrder.amount),
        status: normalizeOrderStatus(data.status ?? 'paid'),
        items: newOrder.items,
        lines: saleLines.map((line) => {
          const unitPrice = Number(line.unitPrice ?? 0);
          const quantity = line.quantity;
          const baseTotal = Number(line.baseTotal ?? unitPrice * quantity);
          const discountPercent = Number(line.discountPercent ?? 0);
          const discountAmount = Number((line.discountAmount ?? (baseTotal * (discountPercent / 100))).toFixed(2));

          return {
            productId: line.productId,
            productName: line.productName,
            quantity,
            unitPrice,
            baseTotal,
            discountPercent,
            discountAmount,
            lineTotal: Number((baseTotal - discountAmount).toFixed(2)),
          };
        }),
        date: new Date(newOrder.date),
      };

      // Registrar movimiento de inventario
      for (const line of saleLines) {
        dispatch({
          type: 'REGISTER_INVENTORY_MOVEMENT',
          payload: {
            productId: line.productId,
            type: 'salida',
            quantity: line.quantity,
            reason: `Venta ${orderWithDefaults.orderNumber}`,
            reference: orderWithDefaults.orderNumber,
          },
        });
      }

      // Registrar la orden en el contexto para caja
      dispatch({ type: 'ADD_ORDER', payload: orderWithDefaults });

      await loadOrders('after-create');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar la venta', 'error');
      return false;
    }
  };

  const columns = [
    {
      header: 'Número de Orden',
      accessor: 'orderNumber' as const,
    },
    {
      header: 'Cliente',
      accessor: 'customerName' as const,
    },
    {
      header: 'Monto',
      accessor: (order: Order) => `$${order.amount.toLocaleString()}`,
    },
    {
      header: 'Artículos',
      accessor: 'items' as const,
    },
    {
      header: 'Estado',
      accessor: (order: Order) => <StatusBadge status={order.status} />,
    },
    {
      header: 'Fecha',
      accessor: (order: Order) => new Date(order.date).toLocaleDateString('es-ES'),
    },
    {
      header: 'Acciones',
      accessor: (order: Order) => (
        <OrderActionButtons 
          order={order} 
          onView={handleViewOrder}
          onEmail={handleSendInvoiceEmail}
          onInvoice={handleGenerateInvoice}
          onPrint={handlePrintTicket}
          onPdf={handleGeneratePdf}
          onCancel={canCancelOrder(order.status) ? handleCancelOrder : undefined}
          onReturn={canReturnOrder(order.status) ? handleReturnOrder : undefined}
          onRefund={canRefundOrder(order.status) ? handleRefundOrder : undefined}
        />
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Ventas</h1>
          <p className="text-muted-foreground mt-1">Administra y monitorea todas las ventas</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar venta..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        loading={isLoadingOrders}
        emptyMessage={ordersError ?? 'No hay ventas registradas'}
      />

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCancelOrder={handleCancelOrder}
        onReturnOrder={handleReturnOrder}
        onRefundOrder={handleRefundOrder}
      />

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
}
