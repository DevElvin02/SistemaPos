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
  {
    id: 'INV-001',
    productId: 'PRD-001',
    productName: 'Premium Coffee Beans',
    quantity: 450,
    minLevel: 100,
    maxLevel: 500,
    warehouseLocation: 'A-15-C',
    lastRestocked: new Date('2024-03-20'),
    status: 'normal',
  },
  {
    id: 'INV-002',
    productId: 'PRD-002',
    productName: 'Organic Tea Set',
    quantity: 280,
    minLevel: 50,
    maxLevel: 400,
    warehouseLocation: 'B-08-A',
    lastRestocked: new Date('2024-03-18'),
    status: 'normal',
  },
  {
    id: 'INV-003',
    productId: 'PRD-003',
    productName: 'Ceramic Mugs (Set of 4)',
    quantity: 120,
    minLevel: 50,
    maxLevel: 300,
    warehouseLocation: 'C-12-B',
    lastRestocked: new Date('2024-03-15'),
    status: 'normal',
  },
  {
    id: 'INV-004',
    productId: 'PRD-004',
    productName: 'Stainless Steel Water Bottle',
    quantity: 60,
    minLevel: 100,
    maxLevel: 250,
    warehouseLocation: 'A-22-D',
    lastRestocked: new Date('2024-03-10'),
    status: 'low',
  },
  {
    id: 'INV-005',
    productId: 'PRD-005',
    productName: 'Bamboo Utensil Set',
    quantity: 220,
    minLevel: 75,
    maxLevel: 350,
    warehouseLocation: 'B-05-C',
    lastRestocked: new Date('2024-03-22'),
    status: 'normal',
  },
];

export const kardexMovements: KardexMovement[] = [];
