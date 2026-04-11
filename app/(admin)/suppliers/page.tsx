'use client';

import { useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/admin/data-table';
import StatusBadge from '@/components/admin/status-badge';
import { GenericActionButtons } from '@/components/admin/generic-action-buttons';
import { DeleteConfirmModal } from '@/components/admin/entity-modals';
import { suppliers, Supplier } from '@/lib/data/suppliers';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState(suppliers);
  const [suppliersList, setSuppliersList] = useState(suppliers);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = suppliersList.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(term) ||
        supplier.email.toLowerCase().includes(term) ||
        supplier.city.toLowerCase().includes(term)
    );
    setFilteredSuppliers(filtered);
  };

  const handleEdit = (supplier: Supplier) => {
    toast.success(`Editando proveedor: ${supplier.name}`);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedSupplier) {
      setSuppliersList(prev => prev.filter(s => s.id !== selectedSupplier.id));
      setFilteredSuppliers(prev => prev.filter(s => s.id !== selectedSupplier.id));
      toast.success('Proveedor eliminado exitosamente');
      setIsDeleteModalOpen(false);
    }
  };

  const columns = [
    {
      header: 'Nombre del Proveedor',
      accessor: 'name' as const,
    },
    {
      header: 'Email',
      accessor: 'email' as const,
    },
    {
      header: 'Ubicación',
      accessor: (supplier: Supplier) => `${supplier.city}, ${supplier.country}`,
    },
    {
      header: 'Calificación',
      accessor: (supplier: Supplier) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{supplier.rating}</span>
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        </div>
      ),
    },
    {
      header: 'Total de Órdenes',
      accessor: 'totalOrders' as const,
    },
    {
      header: 'Términos de Pago',
      accessor: 'paymentTerms' as const,
    },
    {
      header: 'Estado',
      accessor: (supplier: Supplier) => <StatusBadge status={supplier.status} />,
    },
    {
      header: 'Acciones',
      accessor: (supplier: Supplier) => (
        <GenericActionButtons
          onEdit={() => handleEdit(supplier)}
          onDelete={() => handleDelete(supplier)}
        />
      ),
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
          <p className="text-muted-foreground mt-1">Manage supplier relationships</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o ubicación..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredSuppliers} />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        title="Eliminar Proveedor"
        message={`¿Está seguro de que desea eliminar al proveedor "${selectedSupplier?.name}"? Esta acción no se puede deshacer.`}
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
