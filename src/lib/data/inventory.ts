export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  minLevel: number;
  maxLevel: number;
  warehouseLocation: string;
  lastRestocked: Date;
  status: 'normal' | 'low' | 'critical' | 'overstock';
}

export type InventoryMovementType = 'entrada' | 'salida';

export interface KardexMovement {
  id: string;
  date: Date;
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantity: number;
  before: number;
  after: number;
  reason: string;
  reference: string;
}

export const inventory: InventoryItem[] = [
  
];

export const kardexMovements: KardexMovement[] = [];
