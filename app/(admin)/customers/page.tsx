'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/admin/data-table';
import StatusBadge from '@/components/admin/status-badge';
import { GenericActionButtons } from '@/components/admin/generic-action-buttons';
import { CustomerEditModal, DeleteConfirmModal } from '@/components/admin/entity-modals';
import { customers, Customer } from '@/lib/data/customers';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState(customers);
  const [customersList, setCustomersList] = useState(customers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = customersList.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.company?.toLowerCase().includes(term)
    );
    setFilteredCustomers(filtered);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = (updatedCustomer: Customer) => {
    setCustomersList(prev => 
      prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
    );
    setFilteredCustomers(prev =>
      prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
    );
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedCustomer) {
      setCustomersList(prev => prev.filter(c => c.id !== selectedCustomer.id));
      setFilteredCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
      toast.success('Cliente eliminado exitosamente');
      setIsDeleteModalOpen(false);
    }
  };

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
      accessor: 'totalOrders' as const,
    },
    {
      header: 'Total Gastado',
      accessor: (customer: Customer) => `$${customer.totalSpent.toLocaleString()}`,
    },
    {
      header: 'Estado',
      accessor: (customer: Customer) => <StatusBadge status={customer.status} />,
    },
    {
      header: 'Acciones',
      accessor: (customer: Customer) => (
        <GenericActionButtons
          onEdit={() => handleEdit(customer)}
          onDelete={() => handleDelete(customer)}
        />
      ),
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
          <p className="text-muted-foreground mt-1">Manage customer relationships</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredCustomers} />

      {/* Edit Modal */}
      <CustomerEditModal
        customer={selectedCustomer}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveCustomer}
      />

      {/* Delete Confirmation Modal */}
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
