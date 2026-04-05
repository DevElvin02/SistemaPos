import { useEffect, useMemo, useState } from 'react';
import { EyeOff, Plus, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { GenericActionButtons } from '@/components/admin/GenericActionButtons';
import { DeleteConfirmModal } from '@/components/admin/EntityModals';
import { Product } from '@/lib/data/products';
import { InventoryItem } from '@/lib/data/inventory';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function parseProductApiError(rawMessage: string): string {
  if (!rawMessage) return 'Error al guardar producto';
  const lower = rawMessage.toLowerCase();
  if (lower.includes('duplicate entry') && lower.includes('products.sku')) {
    return 'El SKU ya existe. Usa un SKU diferente.';
  }
  if (lower.includes('duplicate entry') && lower.includes('products.barcode')) {
    return 'El código de barras ya existe. Usa uno diferente.';
  }
  return rawMessage;
}

function apiRowToProduct(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    sku: String(row.sku ?? ''),
    barcode: row.barcode ? String(row.barcode) : undefined,
    category: String(row.category_name ?? ''),
    price: Number(row.sale_price ?? 0),
    cost: row.cost_price != null ? Number(row.cost_price) : undefined,
    stock: Number(row.quantity ?? 0),
    minStock: Number(row.min_level ?? 0),
    image: undefined,
    status: (row.status as 'active' | 'inactive' | 'discontinued') ?? 'active',
    createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
  };
}

function inventoryStatus(quantity: number, minLevel: number, maxLevel: number): InventoryItem['status'] {
  if (quantity <= Math.max(1, Math.floor(minLevel * 0.5))) return 'critical';
  if (quantity <= minLevel) return 'low';
  if (quantity > maxLevel) return 'overstock';
  return 'normal';
}

function apiRowToInventoryItem(row: Record<string, unknown>): InventoryItem {
  const quantity = Number(row.quantity ?? 0);
  const minLevel = Number(row.min_level ?? 0);
  const maxLevel = Number(row.max_level ?? 0);

  return {
    id: String(row.id),
    productId: String(row.id),
    productName: String(row.name ?? ''),
    quantity,
    minLevel,
    maxLevel,
    warehouseLocation: 'Sin ubicación',
    lastRestocked: new Date(),
    status: inventoryStatus(quantity, minLevel, maxLevel),
  };
}

type ProductFormMode = 'create' | 'edit';

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  sku: string;
  barcode: string;
  image: string;
  status: 'active' | 'inactive';
}

const buildFormData = (product?: Product): ProductFormData => ({
  name: product?.name ?? '',
  category: product?.category ?? '',
  price: product ? String(product.price) : '',
  cost: product?.cost !== undefined ? String(product.cost) : '',
  stock: product ? String(product.stock) : '',
  minStock: product ? String(product.minStock) : '',
  sku: product?.sku ?? '',
  barcode: product?.barcode ?? '',
  image: product?.image ?? '',
  status: product?.status === 'inactive' ? 'inactive' : 'active',
});

export default function Products() {
  const { state, dispatch } = useAdmin();
  const { hasPermission, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<ProductFormMode>('create');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(buildFormData());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canCreate = hasPermission('products.create');
  const canEdit = hasPermission('products.edit');
  const canDelete = hasPermission('products.delete');

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && Array.isArray(json.data)) {
          dispatch({ type: 'SET_PRODUCTS', payload: json.data.map(apiRowToProduct) });
        }
      })
      .catch(() => { /* sin conexión: usa datos en memoria */ });
  }, [dispatch]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return state.products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        (product.barcode ?? '').toLowerCase().includes(term)
    );
  }, [state.products, searchTerm]);

  const categoryOptions = useMemo(() => {
    return state.categories
      .filter((category) => category.status === 'active' || category.name === formData.category)
      .map((category) => category.name)
      .sort((a, b) => a.localeCompare(b));
  }, [state.categories, formData.category]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openCreateModal = () => {
    if (!canCreate) {
      toast.error('Solo un administrador puede agregar productos');
      return;
    }

    setFormMode('create');
    setSelectedProduct(null);
    setFormData(buildFormData());
    setIsProductModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    if (!canEdit) {
      toast.error('Solo un administrador puede editar productos');
      return;
    }

    setFormMode('edit');
    setSelectedProduct(product);
    setFormData(buildFormData(product));
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if ((formMode === 'create' && !canCreate) || (formMode === 'edit' && !canEdit)) {
      toast.error('No tienes permisos para guardar cambios de productos');
      return;
    }

    const parsedPrice = parseFloat(formData.price);
    const parsedCost = parseFloat(formData.cost);
    const parsedStock = parseInt(formData.stock, 10);
    const parsedMinStock = parseInt(formData.minStock, 10);

    if (!formData.name || !formData.category || !formData.sku || !formData.barcode) {
      toast.error('Completa nombre, categoria, codigo de barras y SKU');
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Precio de venta invalido');
      return;
    }

    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast.error('Costo invalido');
      return;
    }

    if (Number.isNaN(parsedStock) || parsedStock < 0 || Number.isNaN(parsedMinStock) || parsedMinStock < 0) {
      toast.error('Stock y stock minimo deben ser numeros validos');
      return;
    }

    const now = new Date();

    const body = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      sku: formData.sku.trim(),
      barcode: formData.barcode.trim() || null,
      sale_price: parsedPrice,
      cost_price: parsedCost,
      stock: parsedStock,
      min_stock: parsedMinStock,
      status: formData.status,
    };

    if (formMode === 'create') {
      try {
        const res = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(parseProductApiError(json.error || json.message || 'Error al guardar'));
        dispatch({ type: 'ADD_PRODUCT', payload: apiRowToProduct(json.data) });
        const inventoryItem = apiRowToInventoryItem(json.data);
        dispatch({
          type: 'SET_INVENTORY',
          payload: [inventoryItem, ...state.inventory.filter((item) => item.productId !== inventoryItem.productId)],
        });
        toast.success('Producto agregado en la base de datos');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error de conexión con el servidor');
        return;
      }
    } else if (selectedProduct) {
      try {
        const res = await fetch(`${API_URL}/products/${selectedProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(parseProductApiError(json.error || json.message || 'Error al actualizar'));
        dispatch({ type: 'UPDATE_PRODUCT', payload: apiRowToProduct(json.data) });
        const inventoryItem = apiRowToInventoryItem(json.data);
        dispatch({
          type: 'SET_INVENTORY',
          payload: state.inventory.map((item) =>
            item.productId === inventoryItem.productId ? { ...item, ...inventoryItem } : item
          ),
        });
        toast.success('Producto actualizado en la base de datos');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error de conexión con el servidor');
        return;
      }
    }

    setIsProductModalOpen(false);
  };

  const handleDelete = (product: Product) => {
    if (!canDelete) {
      toast.error('Solo un administrador puede eliminar productos');
      return;
    }

    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete) {
      toast.error('No tienes permiso para eliminar productos');
      return;
    }

    if (selectedProduct) {
      try {
        const res = await fetch(`${API_URL}/products/${selectedProduct.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || json.message || 'Error al eliminar');
        }
        dispatch({ type: 'DELETE_PRODUCT', payload: selectedProduct.id });
        dispatch({
          type: 'SET_INVENTORY',
          payload: state.inventory.filter((item) => item.productId !== selectedProduct.id),
        });
        toast.success('Producto eliminado de la base de datos');
        setIsDeleteModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error de conexión con el servidor');
      }
    }
  };

  const handleToggleStatus = async (product: Product) => {
    if (!canEdit) {
      toast.error('Solo un administrador puede activar o desactivar productos');
      return;
    }

    const nextStatus = product.status === 'active' ? 'inactive' : 'active';
    const body = {
      name: product.name,
      category: product.category,
      sku: product.sku,
      barcode: product.barcode ?? null,
      sale_price: product.price,
      cost_price: product.cost ?? 0,
      stock: product.stock,
      min_stock: product.minStock,
      status: nextStatus,
    };

    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar estado');
      dispatch({ type: 'UPDATE_PRODUCT', payload: apiRowToProduct(json.data) });
      toast.success(nextStatus === 'active' ? 'Producto activado' : 'Producto desactivado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de conexión con el servidor');
    }
  };

  const columns = [
    {
      header: 'Imagen',
      accessor: (product: Product) => (
        product.image ? (
          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-md object-cover border border-border" />
        ) : (
          <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
            N/A
          </div>
        )
      ),
    },
    {
      header: 'Nombre del Producto',
      accessor: 'name' as const,
    },
    {
      header: 'SKU',
      accessor: 'sku' as const,
    },
    {
      header: 'Código de Barras',
      accessor: (product: Product) => product.barcode || '-',
    },
    {
      header: 'Categoría',
      accessor: 'category' as const,
    },
    {
      header: 'Precio Venta',
      accessor: (product: Product) => `$${product.price.toLocaleString()}`,
    },
    {
      header: 'Costo',
      accessor: (product: Product) => `$${(product.cost ?? 0).toLocaleString()}`,
    },
    {
      header: 'Stock',
      accessor: (product: Product) => (
        <div>
          <p className="font-medium">{product.stock}</p>
          <p className="text-xs text-muted-foreground">Mín: {product.minStock}</p>
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (product: Product) => <StatusBadge status={product.status} />,
    },
    {
      header: 'Acciones',
      accessor: (product: Product) => (
        <div className="flex items-center gap-2">
          <GenericActionButtons
            onEdit={() => handleEdit(product)}
            onDelete={() => handleDelete(product)}
            disabled={!canEdit && !canDelete}
          />
          {canEdit && (
            <button
              onClick={() => handleToggleStatus(product)}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition whitespace-nowrap"
              title={product.status === 'active' ? 'Desactivar' : 'Activar'}
            >
              {product.status === 'active' ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" /> Desactivar
                </>
              ) : (
                'Activar'
              )}
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
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        {user?.role !== 'cajero' && (
          <button
            onClick={openCreateModal}
            disabled={!canCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredProducts} />

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsProductModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{formMode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Seleccionar categoria...</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Precio de venta</label>
                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Costo</label>
                <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input type="number" value={formData.stock} onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock minimo</label>
                <input type="number" value={formData.minStock} onChange={(e) => setFormData((prev) => ({ ...prev, minStock: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Codigo de barras</label>
                <input type="text" value={formData.barcode} onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen (URL)</label>
                <input type="url" value={formData.image} onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" placeholder="https://..." />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSaveProduct} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        title="Eliminar Producto"
        message={`¿Está seguro de que desea eliminar el producto "${selectedProduct?.name}"? Esta acción no se puede deshacer.`}
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
