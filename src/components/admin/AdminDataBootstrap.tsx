import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { apiRequest } from '@/lib/api';
import type { Product } from '@/lib/data/products';
import type { Customer } from '@/lib/data/customers';
import type { Category } from '@/lib/data/categories';
import type { Supplier } from '@/lib/data/suppliers';
import type { InventoryItem, KardexMovement } from '@/lib/data/inventory';
import type { Order } from '@/lib/data/orders';
import type { Purchase } from '@/lib/data/purchases';
import type { CashSession, CashMovement } from '@/lib/data/cash-register';

function mapProduct(row: Record<string, unknown>): Product {
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
    status: (row.status as Product['status']) ?? 'active',
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
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
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description ? String(row.description) : undefined,
    status: (row.status as Category['status']) ?? 'active',
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
  };
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
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
  };
}

function inventoryStatus(quantity: number, minLevel: number, maxLevel: number): InventoryItem['status'] {
  if (quantity <= Math.max(1, Math.floor(minLevel * 0.5))) return 'critical';
  if (quantity <= minLevel) return 'low';
  if (quantity > maxLevel) return 'overstock';
  return 'normal';
}

function mapInventory(row: Record<string, unknown>): InventoryItem {
  const quantity = Number(row.quantity ?? 0);
  const minLevel = Number(row.min_level ?? 0);
  const maxLevel = Number(row.max_level ?? 0);
  return {
    id: String(row.product_id),
    productId: String(row.product_id),
    productName: String(row.product_name ?? ''),
    quantity,
    minLevel,
    maxLevel,
    warehouseLocation: String(row.warehouse_location ?? 'Sin ubicación'),
    lastRestocked: row.last_restocked_at ? new Date(String(row.last_restocked_at)) : new Date(),
    status: inventoryStatus(quantity, minLevel, maxLevel),
  };
}

function mapKardex(row: Record<string, unknown>): KardexMovement {
  return {
    id: String(row.id),
    date: row.created_at ? new Date(String(row.created_at)) : new Date(),
    productId: String(row.product_id),
    productName: String(row.product_name ?? ''),
    type: (row.movement_type as KardexMovement['type']) ?? 'entrada',
    quantity: Number(row.quantity ?? 0),
    before: Number(row.before_qty ?? 0),
    after: Number(row.after_qty ?? 0),
    reason: String(row.reason ?? ''),
    reference: row.reference_id ? String(row.reference_id) : '-',
  };
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    orderNumber: String(row.sale_number ?? ''),
    customerId: String(row.customer_id ?? ''),
    customerName: String(row.customer_name ?? 'Consumidor final'),
    amount: Number(row.total ?? 0),
    status: (row.status as Order['status']) ?? 'pending',
    items: Number(row.items ?? 0),
    date: row.sale_date ? new Date(String(row.sale_date)) : new Date(),
  };
}

function mapPurchase(row: Record<string, unknown>): Purchase {
  return {
    id: String(row.purchase_number ?? row.id),
    supplierId: String(row.supplier_id ?? ''),
    supplierName: String(row.supplier_name ?? ''),
    lines: [],
    items: Number(row.items ?? 0),
    amount: Number(row.total ?? 0),
    date: row.purchase_date ? new Date(String(row.purchase_date)) : new Date(),
  };
}

function mapCashMovement(row: Record<string, unknown>): CashMovement {
  return {
    id: String(row.id),
    type: (row.movement_type as CashMovement['type']) ?? 'entrada',
    amount: Number(row.amount ?? 0),
    reason: String(row.reason ?? ''),
    reference: row.reference_id ? String(row.reference_id) : String(row.reason ?? ''),
    timestamp: row.created_at ? new Date(String(row.created_at)) : new Date(),
  };
}

export default function AdminDataBootstrap() {
  const { isAuthenticated } = useAuth();
  const { dispatch } = useAdmin();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedRef.current = false;
      return;
    }

    if (loadedRef.current) return;
    loadedRef.current = true;

    Promise.all([
      apiRequest<Record<string, unknown>[]>('/products'),
      apiRequest<Record<string, unknown>[]>('/customers'),
      apiRequest<Record<string, unknown>[]>('/categories'),
      apiRequest<Record<string, unknown>[]>('/suppliers'),
      apiRequest<Record<string, unknown>[]>('/inventory'),
      apiRequest<Record<string, unknown>[]>('/inventory/movements'),
      apiRequest<Record<string, unknown>[]>('/sales'),
      apiRequest<Record<string, unknown>[]>('/purchases'),
      apiRequest<Record<string, unknown>[]>('/cash/sessions'),
      apiRequest<Record<string, unknown>[]>('/cash/movements'),
    ])
      .then(([products, customers, categories, suppliers, inventory, kardex, orders, purchases, sessions, movements]) => {
        const cashMovementsBySession = new Map<string, CashMovement[]>();
        for (const row of movements) {
          const sessionId = String(row.cash_session_id ?? '');
          const items = cashMovementsBySession.get(sessionId) ?? [];
          items.push(mapCashMovement(row));
          cashMovementsBySession.set(sessionId, items);
        }

        const cashSessions: CashSession[] = sessions.map((row) => ({
          id: String(row.id),
          sessionNumber: String(row.session_number ?? ''),
          openedBy: String(row.opened_by ?? ''),
          closedBy: row.closed_by ? String(row.closed_by) : undefined,
          openingAmount: Number(row.opening_amount ?? 0),
          openedAt: row.opened_at ? new Date(String(row.opened_at)) : new Date(),
          closedAt: row.closed_at ? new Date(String(row.closed_at)) : undefined,
          movements: cashMovementsBySession.get(String(row.id)) ?? [],
          notes: row.notes ? String(row.notes) : undefined,
          status: (row.status as CashSession['status']) ?? 'closed',
        }));

        dispatch({ type: 'SET_PRODUCTS', payload: products.map(mapProduct) });
        dispatch({ type: 'SET_CUSTOMERS', payload: customers.map(mapCustomer) });
        dispatch({ type: 'SET_CATEGORIES', payload: categories.map(mapCategory) });
        dispatch({ type: 'SET_SUPPLIERS', payload: suppliers.map(mapSupplier) });
        dispatch({ type: 'SET_INVENTORY', payload: inventory.map(mapInventory) });
        dispatch({ type: 'SET_KARDEX', payload: kardex.map(mapKardex) });
        dispatch({ type: 'SET_ORDERS', payload: orders.map(mapOrder) });
        dispatch({ type: 'SET_PURCHASES', payload: purchases.map(mapPurchase) });
        dispatch({ type: 'SET_CASH_SESSIONS', payload: cashSessions });
      })
      .catch(() => {
        loadedRef.current = false;
      });
  }, [dispatch, isAuthenticated]);

  return null;
}