import { useMemo, useState } from 'react';
import { History, Plus, Search, Star } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { GenericActionButtons } from '@/components/admin/GenericActionButtons';
import { DeleteConfirmModal } from '@/components/admin/EntityModals';
import { Customer } from '@/lib/data/customers';
import { toast } from 'sonner';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  status: 'active' | 'inactive' | 'suspended';
}

type CustomerModalMode = 'create' | 'edit';

const FREQUENT_ORDERS_THRESHOLD = 5;
const FREQUENT_SPENT_THRESHOLD = 500;

const buildCustomerForm = (customer?: Customer): CustomerFormData => ({
  name: customer?.name ?? '',
  email: customer?.email ?? '',
  phone: customer?.phone ?? '',
  company: customer?.company ?? '',
  address: customer?.address ?? '',
  city: customer?.city ?? '',
  country: customer?.country ?? 'El Salvador',
  status: customer?.status ?? 'active',
});

const mapCustomerRow = (row: Record<string, unknown>): Customer => ({
  id: String(row.id),
  name: String(row.name ?? ''),
  email: String(row.email ?? ''),
  phone: String(row.phone ?? ''),
  company: row.company ? String(row.company) : undefined,
  address: String(row.address ?? 'Sin direccion'),
  city: String(row.city ?? ''),
  country: String(row.country ?? 'El Salvador'),
  totalOrders: Number(row.total_orders ?? 0),
  totalSpent: Number(row.total_spent ?? 0),
  status: (row.status as Customer['status']) ?? 'active',
  joinDate: row.created_at ? new Date(String(row.created_at)) : new Date(),
});

export default function Customers() {
  const { state, dispatch } = useAdmin();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [onlyFrequent, setOnlyFrequent] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<CustomerModalMode>('create');
  const [formData, setFormData] = useState<CustomerFormData>(buildCustomerForm());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canCreate = hasPermission('customers.create');
  const canEdit = hasPermission('customers.edit');
  const canDelete = hasPermission('customers.delete');

  const customerMetrics = useMemo(() => {
    const byId = new Map<string, { totalOrders: number; totalSpent: number; lastPurchase?: Date }>();

    for (const customer of state.customers) {
      byId.set(customer.id, {
        totalOrders: 0,
        totalSpent: 0,
        lastPurchase: undefined,
      });
    }

    for (const order of state.orders) {
      const metric = byId.get(order.customerId);
      if (!metric) continue;

      metric.totalOrders += 1;
      metric.totalSpent += order.amount;
      const orderDate = new Date(order.date);
      if (!metric.lastPurchase || orderDate > metric.lastPurchase) {
        metric.lastPurchase = orderDate;
      }
    }

    return byId;
  }, [state.customers, state.orders]);

  const frequentCustomerIds = useMemo(() => {
    return new Set(
      state.customers
        .filter((customer) => {
          const metric = customerMetrics.get(customer.id);
          if (!metric) return false;
          return metric.totalOrders >= FREQUENT_ORDERS_THRESHOLD || metric.totalSpent >= FREQUENT_SPENT_THRESHOLD;
        })
        .map((customer) => customer.id)
    );
  }, [state.customers, customerMetrics]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return state.customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        (customer.company ?? '').toLowerCase().includes(term) ||
        customer.city.toLowerCase().includes(term);

      const matchesCity = selectedCity === 'all' || customer.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesStatus = selectedStatus === 'all' || customer.status === selectedStatus;

      const matchesFrequent = !onlyFrequent || frequentCustomerIds.has(customer.id);
      return matchesSearch && matchesCity && matchesStatus && matchesFrequent;
    });
  }, [frequentCustomerIds, onlyFrequent, searchTerm, selectedCity, selectedStatus, state.customers]);

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        state.customers
          .map((customer) => String(customer.city || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [state.customers]);

  const frequentCustomerCount = frequentCustomerIds.size;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openCreateModal = () => {
    if (!canCreate) {
      toast.error('Solo un administrador puede registrar clientes');
      return;
    }

    setFormMode('create');
    setSelectedCustomer(null);
    setFormData(buildCustomerForm());
    setIsFormModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    if (!canEdit) {
      toast.error('Solo un administrador puede editar clientes');
      return;
    }

    setSelectedCustomer(customer);
    setFormMode('edit');
    setFormData(buildCustomerForm(customer));
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    const emailTaken = state.customers.some(
      (customer) =>
        customer.email.toLowerCase() === formData.email.toLowerCase() &&
        customer.id !== selectedCustomer?.id
    );

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.city.trim()) {
      toast.error('Completa nombre, email, telefono y ciudad');
      return;
    }

    if (emailTaken) {
      toast.error('Ya existe un cliente con ese email');
      return;
    }

    try {
      if (formMode === 'create') {
        const data = await apiRequest<Record<string, unknown>>('/customers', {
          method: 'POST',
          body: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            company: formData.company.trim() || null,
            address: formData.address.trim() || 'Sin direccion',
            city: formData.city.trim(),
            country: formData.country.trim() || 'El Salvador',
            status: formData.status,
          },
        });

        dispatch({ type: 'ADD_CUSTOMER', payload: mapCustomerRow(data) });
        toast.success('Cliente registrado exitosamente');
      } else if (selectedCustomer) {
        const data = await apiRequest<Record<string, unknown>>(`/customers/${selectedCustomer.id}`, {
          method: 'PUT',
          body: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            company: formData.company.trim() || null,
            address: formData.address.trim() || selectedCustomer.address,
            city: formData.city.trim(),
            country: formData.country.trim() || selectedCustomer.country,
            status: formData.status,
          },
        });

        dispatch({ type: 'UPDATE_CUSTOMER', payload: mapCustomerRow(data) });
        toast.success('Cliente actualizado exitosamente');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cliente');
      return;
    }

    setIsFormModalOpen(false);
  };

  const handleDelete = (customer: Customer) => {
    if (!canDelete) {
      toast.error('Solo un administrador puede eliminar clientes');
      return;
    }

    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete) {
      toast.error('No tienes permiso para eliminar clientes');
      return;
    }

    if (selectedCustomer) {
      const hasOrders = state.orders.some((order) => order.customerId === selectedCustomer.id);
      if (hasOrders) {
        toast.error('No puedes eliminar un cliente con historial de compras');
        return;
      }

      try {
        await apiRequest(`/customers/${selectedCustomer.id}`, { method: 'DELETE' });
        dispatch({ type: 'DELETE_CUSTOMER', payload: selectedCustomer.id });
        toast.success('Cliente eliminado exitosamente');
        setIsDeleteModalOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el cliente');
      }
    }
  };

  const openPurchaseHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
  };

  const historyOrders = useMemo(() => {
    if (!historyCustomer) return [];

    return state.orders
      .filter((order) => order.customerId === historyCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyCustomer, state.orders]);

  const columns = [
    {
      header: 'Nombre',
      accessor: 'name' as const,
    },
    {
      header: 'Email',
      accessor: 'email' as const,
    },
    {
      header: 'Empresa',
      accessor: (customer: Customer) => customer.company || '—',
    },
    {
      header: 'Ciudad',
      accessor: 'city' as const,
    },
    {
      header: 'Total de Órdenes',
      accessor: (customer: Customer) => customerMetrics.get(customer.id)?.totalOrders ?? 0,
    },
    {
      header: 'Total Gastado',
      accessor: (customer: Customer) => `$${(customerMetrics.get(customer.id)?.totalSpent ?? 0).toLocaleString()}`,
    },
    {
      header: 'Frecuencia',
      accessor: (customer: Customer) => (
        frequentCustomerIds.has(customer.id) ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <Star className="w-3 h-3" /> Frecuente
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Regular</span>
        )
      ),
    },
    {
      header: 'Estado',
      accessor: (customer: Customer) => <StatusBadge status={customer.status} />,
    },
    {
      header: 'Acciones',
      accessor: (customer: Customer) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPurchaseHistory(customer)}
            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition whitespace-nowrap"
            title="Ver historial de compras"
          >
            <History className="w-4 h-4 mr-1" /> Historial
          </button>
          <GenericActionButtons
            onEdit={() => handleEdit(customer)}
            onDelete={() => handleDelete(customer)}
            disabled={!canEdit && !canDelete}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Clientes</h1>
          <p className="text-muted-foreground mt-1">Registro, historial de compras y clientes frecuentes</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total de clientes</p>
          <p className="text-2xl font-bold mt-1">{state.customers.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Clientes frecuentes</p>
          <p className="text-2xl font-bold mt-1">{frequentCustomerCount}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Promedio por cliente</p>
          <p className="text-2xl font-bold mt-1">
            ${state.customers.length === 0 ? '0.00' : (state.orders.reduce((acc, order) => acc + order.amount, 0) / state.customers.length).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas las ciudades</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:w-56">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap sm:pl-2">
            <input
              type="checkbox"
              checked={onlyFrequent}
              onChange={(e) => setOnlyFrequent(e.target.checked)}
            />
            Solo frecuentes
          </label>
        </div>
      </div>

      <DataTable columns={columns} data={filteredCustomers} />

      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsFormModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{formMode === 'create' ? 'Registrar Cliente' : 'Editar Cliente'}</h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ciudad</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">País</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as Customer['status'] }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSaveCustomer} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {historyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setHistoryCustomer(null)}>
          <div className="bg-card rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Historial de Compras</h2>
                <p className="text-sm opacity-90">{historyCustomer.name}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Compras</p>
                  <p className="text-xl font-bold">{historyOrders.length}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total gastado</p>
                  <p className="text-xl font-bold">${historyOrders.reduce((acc, order) => acc + order.amount, 0).toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Segmento</p>
                  <p className="text-xl font-bold">{frequentCustomerIds.has(historyCustomer.id) ? 'Frecuente' : 'Regular'}</p>
                </div>
              </div>

              {historyOrders.length === 0 ? (
                <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                  Este cliente aun no tiene compras registradas.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-2 text-left">Orden</th>
                        <th className="px-4 py-2 text-left">Fecha</th>
                        <th className="px-4 py-2 text-right">Artículos</th>
                        <th className="px-4 py-2 text-right">Monto</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map((order) => (
                        <tr key={order.id} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-2">{order.orderNumber}</td>
                          <td className="px-4 py-2">{new Date(order.date).toLocaleDateString('es-ES')}</td>
                          <td className="px-4 py-2 text-right">{order.items}</td>
                          <td className="px-4 py-2 text-right">${order.amount.toFixed(2)}</td>
                          <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end">
              <button onClick={() => setHistoryCustomer(null)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        title="Eliminar Cliente"
        message={`¿Está seguro de que desea eliminar al cliente "${selectedCustomer?.name}"? Esta acción no se puede deshacer.`}
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
