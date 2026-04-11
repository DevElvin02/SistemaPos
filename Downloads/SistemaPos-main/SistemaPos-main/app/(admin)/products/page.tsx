'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/admin/data-table';
import StatusBadge from '@/components/admin/status-badge';
import { GenericActionButtons } from '@/components/admin/generic-action-buttons';
import { ProductEditModal, DeleteConfirmModal } from '@/components/admin/entity-modals';
import { products, Product } from '@/lib/data/products';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [productsList, setProductsList] = useState(products);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = productsList.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
    );
    setFilteredProducts(filtered);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    setProductsList(prev =>
      prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    );
    setFilteredProducts(prev =>
      prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    );
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedProduct) {
      setProductsList(prev => prev.filter(p => p.id !== selectedProduct.id));
      setFilteredProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      toast.success('Producto eliminado exitosamente');
      setIsDeleteModalOpen(false);
    }
  };

  const columns = [
    {
      header: 'Nombre del Producto',
      accessor: 'name' as const,
    },
    {
      header: 'SKU',
      accessor: 'sku' as const,
    },
    {
      header: 'Categoría',
      accessor: 'category' as const,
    },
    {
      header: 'Precio',
      accessor: (product: Product) => `$${product.price.toLocaleString()}`,
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
        <GenericActionButtons
          onEdit={() => handleEdit(product)}
          onDelete={() => handleDelete(product)}
        />
      ),
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredProducts} />

      {/* Edit Modal */}
      <ProductEditModal
        product={selectedProduct}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProduct}
      />

      {/* Delete Confirmation Modal */}
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
