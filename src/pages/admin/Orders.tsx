import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { OrderDetailModal } from '@/components/admin/OrderModals';
import { OrderActionButtons } from '@/components/admin/OrderActionButtons';
import { CreateOrderModal } from '@/components/admin/CreateOrderModal';
import { Order } from '@/lib/data/orders';
import {
  generateInvoiceHTML,
  generateReceiptHTML,
  downloadDocument,
  printDocument,
  generateTicketPDF,
} from '@/lib/utils/invoice-generator';
import { toast } from 'sonner';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useCompanySettings } from '@/hooks/use-company-settings';

interface SaleLine {
  productId: string;
  productName: string;
  quantity: number;
}

export default function Orders() {
  const { state, dispatch } = useAdmin();
  const { user } = useAuth();
  const { companySettings } = useCompanySettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredOrders = state.orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm)
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCancelOrder = async (orderId: string) => {
    const target = state.orders.find((order) => order.id === orderId);
    if (!target) return;
    try {
      const data = await apiRequest<Record<string, unknown>>(`/sales/${orderId}/status`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      });
      dispatch({
        type: 'UPDATE_ORDER',
        payload: {
          ...target,
          status: (data.status as Order['status']) ?? 'cancelled',
        },
      });
      toast.success(`Venta ${target.orderNumber} cancelada`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar la venta');
    }
  };

  const getCustomerEmail = (order: Order) => {
    const customer = state.customers.find((c) => c.id === order.customerId);
    return customer?.email || 'cliente@sublimart.com';
  };

  const getInvoiceData = (order: Order) => ({
    order,
    customerName: order.customerName,
    customerEmail: getCustomerEmail(order),
    companyName: companySettings.companyName,
    companyAddress: companySettings.address,
    companyEmail: companySettings.email,
    companyPhone: companySettings.phone,
    companyCountry: companySettings.country,
    invoiceDate: new Date().toLocaleDateString('es-ES'),
  });

  const handleGenerateInvoice = (order: Order) => {
    if (order.status === 'cancelled') {
      toast.error('No se puede facturar una venta cancelada');
      return;
    }

    try {
      const invoiceHTML = generateInvoiceHTML(getInvoiceData(order));
      downloadDocument(invoiceHTML, `Comprobante-${order.orderNumber}.html`);
      toast.success(`Comprobante generado para ${order.orderNumber}`);
    } catch {
      toast.error('No se pudo generar el comprobante');
    }
  };

  const handlePrintTicket = (order: Order) => {
    if (order.status === 'cancelled') {
      toast.error('No se puede imprimir ticket de una venta cancelada');
      return;
    }

    try {
      const receiptHTML = generateReceiptHTML(getInvoiceData(order));
      printDocument(receiptHTML);
      toast.success(`Ticket enviado a impresion: ${order.orderNumber}`);
    } catch {
      toast.error('No se pudo imprimir el ticket');
    }
  };

  const handleGeneratePdf = (order: Order) => {
    if (order.status === 'cancelled') {
      toast.error('No se puede generar PDF de una venta cancelada');
      return;
    }

    try {
      generateTicketPDF(getInvoiceData(order), `Ticket-${order.orderNumber}.pdf`);
      toast.success(`PDF generado para ${order.orderNumber}`);
    } catch {
      toast.error('No se pudo generar el PDF');
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
        toast.error(`No existe inventario para ${line.productName}`);
        return;
      }

      if (line.quantity > inventoryItem.quantity) {
        toast.error(`Stock insuficiente para ${line.productName}. Disponible: ${inventoryItem.quantity}`);
        return;
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
            const product = state.products.find((item) => item.id === line.productId);
            return {
              productId: Number(line.productId),
              quantity: line.quantity,
              unitPrice: product?.price ?? 0,
            };
          }),
        },
      });

      const orderWithDefaults: Order = {
        id: String(data.saleId ?? newOrder.id),
        orderNumber: String(data.saleNumber ?? newOrder.orderNumber),
        customerId: newOrder.customerId,
        customerName: newOrder.customerName,
        amount: Number(data.total ?? newOrder.amount),
        status: 'pending',
        items: newOrder.items,
        date: new Date(newOrder.date),
      };

      dispatch({ type: 'ADD_ORDER', payload: orderWithDefaults });

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la venta');
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
          onInvoice={handleGenerateInvoice}
          onPrint={handlePrintTicket}
          onPdf={handleGeneratePdf}
          onCancel={handleCancelOrder}
        />
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Ventas</h1>
          <p className="text-muted-foreground mt-1">Manage and track all orders</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por número de orden o cliente..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredOrders} />

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCancelOrder={handleCancelOrder}
      />

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
}
