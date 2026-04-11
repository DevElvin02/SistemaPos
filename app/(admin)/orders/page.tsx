'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/admin/data-table';
import StatusBadge from '@/components/admin/status-badge';
import { OrderDetailModal } from '@/components/admin/order-modals';
import { OrderActionButtons } from '@/components/admin/order-action-buttons';
import { CreateOrderModal } from '@/components/admin/create-order-modal';
import { orders, Order } from '@/lib/data/orders';
import { toast } from 'sonner';

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ordersList, setOrdersList] = useState(orders);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = ordersList.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term)
    );
    setFilteredOrders(filtered);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCancelOrder = (orderId: string) => {
    setOrdersList(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
    );
    setFilteredOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleCreateOrder = (newOrder: any) => {
    const orderWithDefaults = {
      ...newOrder,
      id: newOrder.id,
    }
    setOrdersList(prev => [orderWithDefaults, ...prev]);
    setFilteredOrders(prev => [orderWithDefaults, ...prev]);
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
        />
      ),
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Ventas</h1>
          <p className="text-muted-foreground mt-1">Manage and track all orders</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por número de orden o cliente..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredOrders} />

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCancelOrder={handleCancelOrder}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
}
