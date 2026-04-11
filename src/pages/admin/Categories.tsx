import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { GenericActionButtons } from '@/components/admin/GenericActionButtons';
import { DeleteConfirmModal } from '@/components/admin/EntityModals';
import { Category } from '@/lib/data/categories';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface CategoryFormData {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

const buildForm = (category?: Category): CategoryFormData => ({
  name: category?.name ?? '',
  description: category?.description ?? '',
  status: category?.status ?? 'active',
});

const mapCategoryRow = (row: Record<string, unknown>): Category => ({
  id: String(row.id),
  name: String(row.name ?? ''),
  description: row.description ? String(row.description) : undefined,
  status: (row.status as Category['status']) ?? 'active',
  createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
});

export default function Categories() {
  const { state, dispatch } = useAdmin();
  const { hasPermission } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<CategoryFormData>(buildForm());

  const canCreate = hasPermission('categories.create');
  const canEdit = hasPermission('categories.edit');
  const canDelete = hasPermission('categories.delete');

  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return state.categories.filter((category) =>
      category.name.toLowerCase().includes(term) ||
      (category.description ?? '').toLowerCase().includes(term)
    );
  }, [searchTerm, state.categories]);

  const productCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const product of state.products) {
      const key = product.category.toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [state.products]);

  const openCreate = () => {
    if (!canCreate) {
      toast.error('Solo el admin puede crear categorias');
      return;
    }
    setFormMode('create');
    setSelectedCategory(null);
    setFormData(buildForm());
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    if (!canEdit) {
      toast.error('Solo el admin puede editar categorias');
      return;
    }
    setFormMode('edit');
    setSelectedCategory(category);
    setFormData(buildForm(category));
    setIsFormOpen(true);
  };

  const openDelete = (category: Category) => {
    if (!canDelete) {
      toast.error('Solo el admin puede eliminar categorias');
      return;
    }
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const saveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre de la categoria es obligatorio');
      return;
    }

    const duplicate = state.categories.find(
      (c) => c.name.toLowerCase() === formData.name.trim().toLowerCase() && c.id !== selectedCategory?.id
    );
    if (duplicate) {
      toast.error('Ya existe una categoria con ese nombre');
      return;
    }

    try {
      if (formMode === 'create') {
        const data = await apiRequest<Record<string, unknown>>('/categories', {
          method: 'POST',
          body: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            status: formData.status,
          },
        });
        dispatch({ type: 'ADD_CATEGORY', payload: mapCategoryRow(data) });
        toast.success('Categoria agregada');
      } else if (selectedCategory) {
        const data = await apiRequest<Record<string, unknown>>(`/categories/${selectedCategory.id}`, {
          method: 'PUT',
          body: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            status: formData.status,
          },
        });
        dispatch({ type: 'UPDATE_CATEGORY', payload: mapCategoryRow(data) });
        toast.success('Categoria actualizada');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la categoria');
      return;
    }

    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;

    const linkedProducts = state.products.filter(
      (p) => p.category.toLowerCase() === selectedCategory.name.toLowerCase()
    );

    if (linkedProducts.length > 0) {
      toast.error('No puedes eliminar una categoria con productos asociados');
      return;
    }

    try {
      await apiRequest(`/categories/${selectedCategory.id}`, { method: 'DELETE' });
      dispatch({ type: 'DELETE_CATEGORY', payload: selectedCategory.id });
      toast.success('Categoria eliminada');
      setIsDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la categoria');
    }
  };

  const toggleCategory = async (category: Category) => {
    if (!canEdit) {
      toast.error('Solo el admin puede activar/desactivar categorias');
      return;
    }

    try {
      const data = await apiRequest<Record<string, unknown>>(`/categories/${category.id}`, {
        method: 'PUT',
        body: {
          name: category.name,
          description: category.description || null,
          status: category.status === 'active' ? 'inactive' : 'active',
        },
      });
      dispatch({ type: 'UPDATE_CATEGORY', payload: mapCategoryRow(data) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la categoria');
    }
  };

  const columns = [
    {
      header: 'Nombre',
      accessor: 'name' as const,
    },
    {
      header: 'Descripcion',
      accessor: (category: Category) => category.description || '-',
    },
    {
      header: 'Productos',
      accessor: (category: Category) => productCountByCategory[category.name.toLowerCase()] || 0,
    },
    {
      header: 'Estado',
      accessor: (category: Category) => <StatusBadge status={category.status} />,
    },
    {
      header: 'Acciones',
      accessor: (category: Category) => (
        <div className="flex items-center gap-2">
          <GenericActionButtons
            onEdit={() => openEdit(category)}
            onDelete={() => openDelete(category)}
            disabled={!canEdit && !canDelete}
          />
          {canEdit && (
            <button
              onClick={() => toggleCategory(category)}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition"
            >
              {category.status === 'active' ? 'Desactivar' : 'Activar'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground mt-1">Organiza los productos por categoria</p>
        </div>
        <button
          onClick={openCreate}
          disabled={!canCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoria
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar categoria..."
            className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredCategories} />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsFormOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{formMode === 'create' ? 'Nueva Categoria' : 'Editar Categoria'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripcion</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={saveCategory} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        title="Eliminar Categoria"
        message={`¿Deseas eliminar la categoria "${selectedCategory?.name}"?`}
        isOpen={isDeleteOpen}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
