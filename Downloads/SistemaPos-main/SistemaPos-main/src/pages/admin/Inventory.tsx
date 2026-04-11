import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, PackageCheck, Search } from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { InventoryItem, KardexMovement } from '@/lib/data/inventory';
import { toast } from 'sonner';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

type MovementType = 'entrada' | 'salida';

export default function Inventory() {
  const { state, dispatch } = useAdmin();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [minDrafts, setMinDrafts] = useState<Record<string, string>>({});

  const [movementProductId, setMovementProductId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('entrada');
  const [movementQty, setMovementQty] = useState('1');
  const [movementReason, setMovementReason] = useState('');
  const [movementReference, setMovementReference] = useState('');

  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return state.inventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(term) ||
        item.warehouseLocation.toLowerCase().includes(term)
    );
  }, [state.inventory, searchTerm]);

  const lowStockItems = useMemo(
    () => state.inventory.filter((item) => item.status === 'low' || item.status === 'critical'),
    [state.inventory]
  );

  const totalEntradas = useMemo(
    () => state.kardex.filter((m) => m.type === 'entrada').reduce((acc, m) => acc + m.quantity, 0),
    [state.kardex]
  );

  const totalSalidas = useMemo(
    () => state.kardex.filter((m) => m.type === 'salida').reduce((acc, m) => acc + m.quantity, 0),
    [state.kardex]
  );

  const stockTotal = useMemo(
    () => state.inventory.reduce((acc, item) => acc + item.quantity, 0),
    [state.inventory]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleMinDraftChange = (itemId: string, value: string) => {
    setMinDrafts((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSaveMin = async (itemId: string) => {
    const draft = minDrafts[itemId];
    if (draft === undefined) return;

    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Stock minimo invalido');
      return;
    }

    const inventoryItem = state.inventory.find((item) => item.id === itemId);
    if (!inventoryItem) return;

    try {
      await apiRequest(`/inventory/${inventoryItem.productId}`, {
        method: 'PATCH',
        body: { minLevel: parsed },
      });
      dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: { id: itemId, minLevel: parsed } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el stock minimo');
      return;
    }

    setMinDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    toast.success('Stock minimo actualizado');
  };

  const registerMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!movementProductId) {
      toast.error('Selecciona un producto');
      return;
    }

    const qty = parseInt(movementQty, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error('Cantidad invalida');
      return;
    }

    const selected = state.inventory.find((item) => item.productId === movementProductId);
    if (!selected) {
      toast.error('Producto no encontrado en inventario');
      return;
    }

    if (movementType === 'salida' && qty > selected.quantity) {
      toast.error('No hay stock suficiente para la salida');
      return;
    }

    try {
      await apiRequest('/inventory/movements', {
        method: 'POST',
        body: {
          productId: movementProductId,
          type: movementType,
          quantity: qty,
          reason: movementReason.trim() || (movementType === 'entrada' ? 'Compra / ajuste de entrada' : 'Venta / ajuste de salida'),
          reference: movementReference.trim() || '-',
          userId: user?.id || null,
        },
      });

      dispatch({
        type: 'REGISTER_INVENTORY_MOVEMENT',
        payload: {
          productId: movementProductId,
          type: movementType,
          quantity: qty,
          reason: movementReason.trim() || (movementType === 'entrada' ? 'Compra / ajuste de entrada' : 'Venta / ajuste de salida'),
          reference: movementReference.trim() || '-',
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el movimiento');
      return;
    }

    setMovementQty('1');
    setMovementReason('');
    setMovementReference('');
    toast.success(`Movimiento de ${movementType} registrado`);
  };

  const columns = [
    {
      header: 'Nombre del Producto',
      accessor: 'productName' as const,
    },
    {
      header: 'Ubicación',
      accessor: 'warehouseLocation' as const,
    },
    {
      header: 'Stock Actual',
      accessor: 'quantity' as const,
    },
    {
      header: 'Stock Minimo',
      accessor: (item: InventoryItem) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minDrafts[item.id] ?? String(item.minLevel)}
            onChange={(e) => handleMinDraftChange(item.id, e.target.value)}
            className="w-20 px-2 py-1 rounded border border-border bg-background"
          />
          <button
            type="button"
            onClick={() => handleSaveMin(item.id)}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-muted"
          >
            Guardar
          </button>
        </div>
      ),
    },
    {
      header: 'Máximo',
      accessor: 'maxLevel' as const,
    },
    {
      header: 'Último Reabastecimiento',
      accessor: (item: InventoryItem) => new Date(item.lastRestocked).toLocaleDateString('es-ES'),
    },
    {
      header: 'Estado',
      accessor: (item: InventoryItem) => <StatusBadge status={item.status} />,
    },
  ];

  const kardexColumns = [
    {
      header: 'Fecha',
      accessor: (m: KardexMovement) => m.date.toLocaleString('es-ES'),
    },
    {
      header: 'Producto',
      accessor: 'productName' as const,
    },
    {
      header: 'Tipo',
      accessor: (m: KardexMovement) => (
        <StatusBadge status={m.type === 'entrada' ? 'active' : 'processing'} />
      ),
    },
    {
      header: 'Cantidad',
      accessor: 'quantity' as const,
    },
    {
      header: 'Antes',
      accessor: 'before' as const,
    },
    {
      header: 'Despues',
      accessor: 'after' as const,
    },
    {
      header: 'Motivo',
      accessor: 'reason' as const,
    },
    {
      header: 'Referencia',
      accessor: 'reference' as const,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Gestión de Inventario</h1>
        <p className="text-muted-foreground mt-1">Control total de stock, entradas, salidas y kardex</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Stock Total</p>
          <p className="text-2xl font-bold mt-1">{stockTotal}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Alertas Bajo Inventario</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{lowStockItems.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Entradas (Compras)</p>
          <p className="text-2xl font-bold mt-1 text-green-600">+{totalEntradas}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Salidas (Ventas)</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">-{totalSalidas}</p>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-card rounded-lg border border-destructive/40 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Alertas de bajo inventario</h3>
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="text-sm">
                {item.productName}: stock {item.quantity} / minimo {item.minLevel}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por producto o ubicación..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <h3 className="font-semibold mb-4">Registrar Movimiento (Entradas / Salidas)</h3>
        <form onSubmit={registerMovement} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={movementProductId}
            onChange={(e) => setMovementProductId(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="">Producto...</option>
            {state.inventory.map((item) => (
              <option key={item.productId} value={item.productId}>
                {item.productName}
              </option>
            ))}
          </select>

          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as MovementType)}
            className="px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="entrada">Entrada (Compra)</option>
            <option value="salida">Salida (Venta)</option>
          </select>

          <input
            type="number"
            min={1}
            value={movementQty}
            onChange={(e) => setMovementQty(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg"
            placeholder="Cantidad"
          />

          <input
            type="text"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg"
            placeholder="Motivo"
          />

          <input
            type="text"
            value={movementReference}
            onChange={(e) => setMovementReference(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg"
            placeholder="Ref (factura, orden, etc.)"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {movementType === 'entrada' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            Registrar
          </button>
        </form>
      </div>

      <DataTable columns={columns} data={filteredInventory} />

      <div className="mt-8 mb-4 flex items-center gap-2">
        <PackageCheck className="w-5 h-5" />
        <h2 className="text-2xl font-bold">Kardex de Movimientos</h2>
      </div>

      <DataTable columns={kardexColumns} data={state.kardex} />
    </div>
  );
}
