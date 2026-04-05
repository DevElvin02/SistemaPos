import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Order } from '../lib/data/orders';
import { Customer } from '../lib/data/customers';
import { Product } from '../lib/data/products';
import { Supplier } from '../lib/data/suppliers';
import { InventoryItem, KardexMovement, InventoryMovementType } from '../lib/data/inventory';
import { Category } from '../lib/data/categories';
import { Purchase } from '../lib/data/purchases';
import { CashSession } from '../lib/data/cash-register';

interface AdminState {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  kardex: KardexMovement[];
  cashSessions: CashSession[];
  sidebarOpen: boolean;
}

type AdminAction = 
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'SET_SUPPLIERS'; payload: Supplier[] }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'DELETE_SUPPLIER'; payload: string }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'SET_PURCHASES'; payload: Purchase[] }
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'DELETE_PURCHASE'; payload: string }
  | { type: 'SET_INVENTORY'; payload: InventoryItem[] }
  | { type: 'UPDATE_INVENTORY_ITEM'; payload: { id: string; minLevel?: number; maxLevel?: number; quantity?: number } }
  | {
      type: 'REGISTER_INVENTORY_MOVEMENT';
      payload: {
        productId: string;
        type: InventoryMovementType;
        quantity: number;
        reason: string;
        reference: string;
      };
    }
  | { type: 'SET_KARDEX'; payload: KardexMovement[] }
  | { type: 'SET_CASH_SESSIONS'; payload: CashSession[] }
  | { type: 'OPEN_CASH_SESSION'; payload: { userId: string; openingAmount: number } }
  | {
      type: 'ADD_CASH_MOVEMENT';
      payload: {
        sessionId: string;
        movementType: 'entrada' | 'salida' | 'gasto' | 'ingreso';
        amount: number;
        reason: string;
        reference: string;
      };
    }
  | {
      type: 'CLOSE_CASH_SESSION';
      payload: {
        sessionId: string;
        userId: string;
        actualCash: number;
        notes?: string;
      };
    }
  | { type: 'TOGGLE_SIDEBAR' };

interface AdminContextType {
  state: AdminState;
  dispatch: React.Dispatch<AdminAction>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children, initialState }: { children: ReactNode; initialState: AdminState }) {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  const calculateInventoryStatus = (quantity: number, minLevel: number, maxLevel: number): InventoryItem['status'] => {
    if (quantity <= Math.max(1, Math.floor(minLevel * 0.5))) return 'critical';
    if (quantity <= minLevel) return 'low';
    if (quantity > maxLevel) return 'overstock';
    return 'normal';
  };

  switch (action.type) {
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'ADD_ORDER': {
      const openSession = state.cashSessions.find((session) => session.status === 'open');

      if (!openSession) {
        return { ...state, orders: [action.payload, ...state.orders] };
      }

      const saleMovement = {
        id: `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'entrada' as const,
        amount: action.payload.amount,
        reason: `Venta ${action.payload.orderNumber}`,
        reference: action.payload.orderNumber,
        timestamp: new Date(),
      };

      const updatedSessions = state.cashSessions.map((session): CashSession => {
        if (session.id !== openSession.id) return session;
        return {
          ...session,
          movements: [saleMovement, ...session.movements],
        };
      });

      return {
        ...state,
        orders: [action.payload, ...state.orders],
        cashSessions: updatedSessions,
      };
    }
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o),
      };
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter(o => o.id !== action.payload) };

    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [action.payload, ...state.customers] };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };

    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [action.payload, ...state.products] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [action.payload, ...state.categories] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };

    case 'SET_SUPPLIERS':
      return { ...state, suppliers: action.payload };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [action.payload, ...state.suppliers] };
    case 'UPDATE_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s),
      };
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload) };

    case 'SET_PURCHASES':
      return { ...state, purchases: action.payload };
    case 'ADD_PURCHASE':
      return { ...state, purchases: [action.payload, ...state.purchases] };
    case 'DELETE_PURCHASE':
      return { ...state, purchases: state.purchases.filter((p) => p.id !== action.payload) };

    case 'SET_INVENTORY':
      return { ...state, inventory: action.payload };

    case 'UPDATE_INVENTORY_ITEM':
      return {
        ...state,
        inventory: state.inventory.map((item) => {
          if (item.id !== action.payload.id) return item;

          const quantity = action.payload.quantity ?? item.quantity;
          const minLevel = action.payload.minLevel ?? item.minLevel;
          const maxLevel = action.payload.maxLevel ?? item.maxLevel;

          return {
            ...item,
            quantity,
            minLevel,
            maxLevel,
            status: calculateInventoryStatus(quantity, minLevel, maxLevel),
            lastRestocked: (action.payload.quantity ?? item.quantity) > item.quantity ? new Date() : item.lastRestocked,
          };
        }),
      };

    case 'REGISTER_INVENTORY_MOVEMENT': {
      const target = state.inventory.find((item) => item.productId === action.payload.productId);
      if (!target) return state;

      const before = target.quantity;
      const after = action.payload.type === 'entrada'
        ? before + action.payload.quantity
        : Math.max(0, before - action.payload.quantity);

      const updatedInventory = state.inventory.map((item) => {
        if (item.productId !== action.payload.productId) return item;
        return {
          ...item,
          quantity: after,
          lastRestocked: action.payload.type === 'entrada' ? new Date() : item.lastRestocked,
          status: calculateInventoryStatus(after, item.minLevel, item.maxLevel),
        };
      });

      const movement: KardexMovement = {
        id: `KDX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date(),
        productId: target.productId,
        productName: target.productName,
        type: action.payload.type,
        quantity: action.payload.quantity,
        before,
        after,
        reason: action.payload.reason,
        reference: action.payload.reference || '-',
      };

      return {
        ...state,
        inventory: updatedInventory,
        kardex: [movement, ...state.kardex],
      };
    }

    case 'SET_KARDEX':
      return { ...state, kardex: action.payload };

    case 'SET_CASH_SESSIONS':
      return { ...state, cashSessions: action.payload };

    case 'OPEN_CASH_SESSION': {
      const sessionId = `CASH-${Date.now()}`;
      const newSession: CashSession = {
        id: sessionId,
        sessionNumber: `SES-${state.cashSessions.length + 1}`,
        openedBy: action.payload.userId,
        openingAmount: action.payload.openingAmount,
        openedAt: new Date(),
        movements: [],
        status: 'open',
      };
      return { ...state, cashSessions: [newSession, ...state.cashSessions] };
    }

    case 'ADD_CASH_MOVEMENT': {
      const updatedSessions = state.cashSessions.map((session): CashSession => {
        if (session.id !== action.payload.sessionId) return session;
        return {
          ...session,
          movements: [
            {
              id: `MOV-${Date.now()}`,
              type: action.payload.movementType,
              amount: action.payload.amount,
              reason: action.payload.reason,
              reference: action.payload.reference,
              timestamp: new Date(),
            },
            ...session.movements,
          ],
        };
      });
      return { ...state, cashSessions: updatedSessions };
    }

    case 'CLOSE_CASH_SESSION': {
      const updatedSessions = state.cashSessions.map((session): CashSession => {
        if (session.id !== action.payload.sessionId) return session;
        return {
          ...session,
          status: 'closed' as const,
          closedBy: action.payload.userId,
          closedAt: new Date(),
          notes: action.payload.notes,
        };
      });
      return { ...state, cashSessions: updatedSessions };
    }

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    default:
      return state;
  }
}
