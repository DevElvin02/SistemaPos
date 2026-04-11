import { useMemo, useState } from 'react';
import { PackagePlus, Plus, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Purchase, PurchaseLine } from '@/lib/data/purchases';
import { apiRequest } from '@/lib/api';

interface PurchaseFormData {
  supplierId: string;
  date: string;
}

const initialFormData: PurchaseFormData = {
  supplierId: '',
  date: new Date().toISOString().slice(0, 10),
};

export default function Purchases() {
  const { state, dispatch } = useAdmin();
  const { hasPermission, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [formData, setFormData] = useState<PurchaseFormData>(initialFormData);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseLine[]>([]);

  const canCreate = hasPermission('purchases.create');

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return state.purchases.filter(
      (purchase) =>
        purchase.id.toLowerCase().includes(term) ||
        purchase.supplierName.toLowerCase().includes(term)
    );
  }, [searchTerm, state.purchases]);

  const selectedSupplier = useMemo(
    () => state.suppliers.find((supplier) => supplier.id === formData.supplierId),
    [formData.supplierId, state.suppliers]
  );

  const productOptions = useMemo(() => {
    if (!selectedSupplier) return state.products;

    if (!selectedSupplier.productsSold || selectedSupplier.productsSold.length === 0) {
      return state.products;
    }

    const normalize = (value: string) => value.toLowerCase().trim();
    const supplierKeys = new Set(selectedSupplier.productsSold.map((value) => normalize(String(value))));

    const matched: typeof state.products = [];
    const others: typeof state.products = [];

    for (const product of state.products) {
      const productName = normalize(product.name);
      const productSku = normalize(product.sku);
      const productId = normalize(product.id);
      const isMatch = supplierKeys.has(productName) || supplierKeys.has(productSku) || supplierKeys.has(productId);

      if (isMatch) {
        matched.push(product);
      } else {
        others.push(product);
      }
    }

    // No ocultar productos por desajustes de catálogo del proveedor:
    // mostramos primero los asociados y luego el resto.
    return [...matched, ...others];
  }, [selectedSupplier, state.products]);

  const totalItems = useMemo(
    () => lineItems.reduce((acc, line) => acc + line.quantity, 0),
    [lineItems]
  );

  const totalCost = useMemo(
    () => lineItems.reduce((acc, line) => acc + line.subtotal, 0),
    [lineItems]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedProductId('');
    setQuantity('1');
    setUnitCost('');
    setLineItems([]);
  };

  const openPurchaseModal = () => {
    if (!canCreate) {
      toast.error('No tienes permiso para registrar compras');
      return;
    }

    resetForm();
    setIsPurchaseModalOpen(true);
  };

  const handleAddLine = () => {
    const product = state.products.find((item) => item.id === selectedProductId);
    if (!product) {
      toast.error('Selecciona un producto');
      return;
    }

    const parsedQuantity = parseInt(quantity, 10);
    const parsedCost = parseFloat(unitCost);

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Cantidad invalida');
      return;
    }

    if (Number.isNaN(parsedCost) || parsedCost <= 0) {
      toast.error('Costo invalido');
      return;
    }

    setLineItems((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id
            ? {
                ...line,
                quantity: line.quantity + parsedQuantity,
                unitCost: parsedCost,
                subtotal: (line.quantity + parsedQuantity) * parsedCost,
              }
            : line
        );
      }

      return [
        ...prev,
        {
          id: `LIN-${Date.now()}-${product.id}`,
          productId: product.id,
          productName: product.name,
          quantity: parsedQuantity,
          unitCost: parsedCost,
          subtotal: parsedQuantity * parsedCost,
        },
      ];
    });

    setSelectedProductId('');
    setQuantity('1');
    setUnitCost('');
  };

  const handleRemoveLine = (lineId: string) => {
    setLineItems((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleSavePurchase = async () => {
    if (!canCreate) {
      toast.error('No tienes permiso para registrar compras');
      return;
    }

    if (!formData.supplierId) {
      toast.error('Selecciona un proveedor');
      return;
    }

    if (!formData.date) {
      toast.error('Selecciona una fecha');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    const supplier = state.suppliers.find((item) => item.id === formData.supplierId);
    if (!supplier) {
      toast.error('Proveedor invalido');
      return;
    }

    try {
      const data = await apiRequest<Record<string, unknown>>('/purchases', {
        method: 'POST',
        body: {
          supplierId: Number(supplier.id),
          userId: user?.id ? Number(user.id) : null,
          purchaseDate: formData.date,
          lines: lineItems.map((line) => ({
            productId: Number(line.productId),
            quantity: line.quantity,
            unitCost: line.unitCost,
          })),
        },
      });

      const purchase: Purchase = {
        id: String(data.purchase_number ?? data.id),
        supplierId: supplier.id,
        supplierName: supplier.name,
        lines: lineItems,
        items: totalItems,
        amount: Number(data.total ?? totalCost),
        date: new Date(formData.date),
      };

      dispatch({ type: 'ADD_PURCHASE', payload: purchase });

      for (const line of lineItems) {
        dispatch({
          type: 'REGISTER_INVENTORY_MOVEMENT',
          payload: {
            productId: line.productId,
            type: 'entrada',
            quantity: line.quantity,
            reason: `Compra ${purchase.id}`,
            reference: purchase.id,
          },
        });
      }

      toast.success('Compra registrada e inventario actualizado');
      setIsPurchaseModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la compra');
    }
  };

  const columns = [
    {
      header: 'Numero de PO',
      accessor: 'id' as const,
    },
    {
      header: 'Proveedor',
      accessor: 'supplierName' as const,
    },
    {
      header: 'Monto',
      accessor: (order: Purchase) => `$${order.amount.toLocaleString()}`,
    },
    {
      header: 'Articulos',
      accessor: 'items' as const,
    },
    {
      header: 'Estado',
      accessor: () => <StatusBadge status="delivered" />,
    },
    {
      header: 'Fecha',
      accessor: (order: Purchase) => new Date(order.date).toLocaleDateString('es-ES'),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Compras</h1>
          <p className="text-muted-foreground mt-1">Registro de compras para abastecimiento</p>
        </div>
        <button
          onClick={openPurchaseModal}
          disabled={!canCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Compra
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por numero de PO o proveedor..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredPurchases} />

      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsPurchaseModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Registrar Compra</h2>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Proveedor</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {state.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="font-semibold">Detalle de productos</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Producto</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    >
                      <option value="">Seleccionar producto...</option>
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Costo unitario</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition"
                >
                  <PackagePlus className="w-4 h-4" /> Agregar producto
                </button>

                {lineItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay productos agregados.</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2 text-left">Producto</th>
                          <th className="px-3 py-2 text-right">Cantidad</th>
                          <th className="px-3 py-2 text-right">Costo</th>
                          <th className="px-3 py-2 text-right">Subtotal</th>
                          <th className="px-3 py-2 text-right">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((line) => (
                          <tr key={line.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{line.productName}</td>
                            <td className="px-3 py-2 text-right">{line.quantity}</td>
                            <td className="px-3 py-2 text-right">${line.unitCost.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">${line.subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => handleRemoveLine(line.id)} className="text-destructive hover:underline">
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total de productos</p>
                  <p className="text-xl font-bold">{totalItems}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Costo total</p>
                  <p className="text-xl font-bold">${totalCost.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsPurchaseModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSavePurchase} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar compra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
