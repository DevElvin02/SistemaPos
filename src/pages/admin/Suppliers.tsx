import { useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { GenericActionButtons } from '@/components/admin/GenericActionButtons';
import { DeleteConfirmModal } from '@/components/admin/EntityModals';
import { Supplier } from '@/lib/data/suppliers';
import { toast } from 'sonner';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

type SupplierModalMode = 'create' | 'edit';

interface SupplierFormData {
  name: string;
  contact: string;
  productsSold: string[];
  status: Supplier['status'];
}

const buildSupplierForm = (supplier?: Supplier): SupplierFormData => ({
  name: supplier?.name ?? '',
  contact: supplier?.contact ?? supplier?.phone ?? supplier?.email ?? '',
  productsSold: supplier?.productsSold ?? [],
  status: supplier?.status ?? 'active',
});

const mapSupplierRow = (row: Record<string, unknown>): Supplier => ({
  id: String(row.id),
  name: String(row.name ?? ''),
  contact: String(row.contact_name ?? row.phone ?? row.email ?? ''),
  email: row.email ? String(row.email) : undefined,
  phone: row.phone ? String(row.phone) : undefined,
  productsSold: Array.isArray(row.products_sold) ? (row.products_sold as string[]) : [],
  website: row.website ? String(row.website) : undefined,
  address: String(row.address ?? 'No especificada'),
  city: String(row.city ?? 'No especificada'),
  country: String(row.country ?? 'El Salvador'),
  status: (row.status as Supplier['status']) ?? 'active',
  totalOrders: Number(row.total_orders ?? 0),
  rating: Number(row.rating ?? 0),
  paymentTerms: String(row.payment_terms ?? 'Por definir'),
  joinDate: row.join_date ? new Date(String(row.join_date)) : new Date(),
});

export default function Suppliers() {
  const { state, dispatch } = useAdmin();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [formMode, setFormMode] = useState<SupplierModalMode>('create');
  const [formData, setFormData] = useState<SupplierFormData>(buildSupplierForm());
  const [manualProductInput, setManualProductInput] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canCreate = hasPermission('suppliers.create');
  const canEdit = hasPermission('suppliers.edit');
  const canDelete = hasPermission('suppliers.delete');

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return state.suppliers.filter((supplier) => {
      const productsText = (supplier.productsSold ?? []).join(' ').toLowerCase();
      return (
        supplier.name.toLowerCase().includes(term) ||
        (supplier.contact ?? '').toLowerCase().includes(term) ||
        productsText.includes(term)
      );
    });
  }, [searchTerm, state.suppliers]);

  const productOptions = useMemo(() => {
    return [...state.products]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => product.name);
  }, [state.products]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openCreateModal = () => {
    if (!canCreate) {
      toast.error('Solo un administrador puede registrar proveedores');
      return;
    }

    setFormMode('create');
    setSelectedSupplier(null);
    setFormData(buildSupplierForm());
    setManualProductInput('');
    setIsSupplierModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    if (!canEdit) {
      toast.error('Solo un administrador puede editar proveedores');
      return;
    }

    setFormMode('edit');
    setSelectedSupplier(supplier);
    setFormData(buildSupplierForm(supplier));
    setManualProductInput('');
    setIsSupplierModalOpen(true);
  };

  const toggleProductSelection = (productName: string) => {
    setFormData((prev) => ({
      ...prev,
      productsSold: prev.productsSold.includes(productName)
        ? prev.productsSold.filter((name) => name !== productName)
        : [...prev.productsSold, productName],
    }));
  };

  const handleAddManualProduct = () => {
    const productName = manualProductInput.trim();
    if (!productName) {
      toast.error('Ingresa el nombre del producto a agregar');
      return;
    }

    const exists = formData.productsSold.some((name) => name.toLowerCase() === productName.toLowerCase());
    if (exists) {
      toast.error('Ese producto ya fue agregado');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      productsSold: [...prev.productsSold, productName],
    }));
    setManualProductInput('');
  };

  const handleRemoveProductTag = (productName: string) => {
    setFormData((prev) => ({
      ...prev,
      productsSold: prev.productsSold.filter((name) => name !== productName),
    }));
  };

  const handleSaveSupplier = async () => {
    if ((formMode === 'create' && !canCreate) || (formMode === 'edit' && !canEdit)) {
      toast.error('No tienes permisos para guardar proveedores');
      return;
    }

    if (!formData.name.trim() || !formData.contact.trim()) {
      toast.error('Completa nombre y contacto del proveedor');
      return;
    }

    try {
      if (formMode === 'create') {
        const data = await apiRequest<Record<string, unknown>>('/suppliers', {
          method: 'POST',
          body: {
            name: formData.name.trim(),
            contact: formData.contact.trim(),
            productsSold: formData.productsSold,
            status: formData.status,
          },
        });

        dispatch({ type: 'ADD_SUPPLIER', payload: mapSupplierRow(data) });
        toast.success('Proveedor registrado exitosamente');
      } else if (selectedSupplier) {
        const data = await apiRequest<Record<string, unknown>>(`/suppliers/${selectedSupplier.id}`, {
          method: 'PUT',
          body: {
            name: formData.name.trim(),
            contact: formData.contact.trim(),
            productsSold: formData.productsSold,
            status: formData.status,
            email: selectedSupplier.email || null,
            phone: formData.contact.trim(),
            website: selectedSupplier.website || null,
            address: selectedSupplier.address,
            city: selectedSupplier.city,
            country: selectedSupplier.country,
            totalOrders: selectedSupplier.totalOrders,
            rating: selectedSupplier.rating,
            paymentTerms: selectedSupplier.paymentTerms,
          },
        });

        dispatch({ type: 'UPDATE_SUPPLIER', payload: mapSupplierRow(data) });
        toast.success('Proveedor actualizado exitosamente');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el proveedor');
      return;
    }

    setIsSupplierModalOpen(false);
  };

  const handleDelete = (supplier: Supplier) => {
    if (!canDelete) {
      toast.error('Solo un administrador puede eliminar proveedores');
      return;
    }

    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete) {
      toast.error('No tienes permiso para eliminar proveedores');
      return;
    }

    if (selectedSupplier) {
      try {
        await apiRequest(`/suppliers/${selectedSupplier.id}`, { method: 'DELETE' });
        dispatch({ type: 'DELETE_SUPPLIER', payload: selectedSupplier.id });
        toast.success('Proveedor eliminado exitosamente');
        setIsDeleteModalOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el proveedor');
      }
    }
  };

  const columns = [
    {
      header: 'Nombre del Proveedor',
      accessor: 'name' as const,
    },
    {
      header: 'Contacto',
      accessor: (supplier: Supplier) => supplier.contact || supplier.phone || supplier.email || '-',
    },
    {
      header: 'Productos que vende',
      accessor: (supplier: Supplier) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {supplier.productsSold.map((product) => (
            <span key={`${supplier.id}-${product}`} className="px-2 py-1 rounded-full bg-muted text-xs">
              {product}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (supplier: Supplier) => <StatusBadge status={supplier.status} />,
    },
    {
      header: 'Acciones',
      accessor: (supplier: Supplier) => (
        <GenericActionButtons
          onEdit={() => openEditModal(supplier)}
          onDelete={() => handleDelete(supplier)}
          disabled={!canEdit && !canDelete}
        />
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Proveedores</h1>
          <p className="text-muted-foreground mt-1">Abastecimiento: nombre, contacto y productos que vende</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredSuppliers} />

      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsSupplierModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{formMode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}</h2>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    placeholder="Ej: Distribuidora Central"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contacto</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    placeholder="Nombre + telefono o correo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Productos que vende <span className="text-xs text-muted-foreground">(opcional)</span></label>
                {productOptions.length === 0 ? (
                  <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                    No hay productos registrados para asignar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-lg border border-border p-3">
                    {productOptions.map((productName) => (
                      <label key={productName} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.productsSold.includes(productName)}
                          onChange={() => toggleProductSelection(productName)}
                        />
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {productName}
                      </label>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">Agregar producto manualmente</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualProductInput}
                      onChange={(e) => setManualProductInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualProduct();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-lg"
                      placeholder="Ej: Azucar morena al por mayor"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualProduct}
                      className="px-3 py-2 rounded-lg border border-border hover:bg-muted transition"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {formData.productsSold.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.productsSold.map((productName) => (
                      <button
                        key={`tag-${productName}`}
                        type="button"
                        onClick={() => handleRemoveProductTag(productName)}
                        className="px-2 py-1 rounded-full bg-muted text-xs hover:bg-muted/70 transition"
                        title="Quitar producto"
                      >
                        {productName} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as Supplier['status'] }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSaveSupplier} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

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
