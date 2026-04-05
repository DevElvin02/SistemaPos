export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
}

export const products: Product[] = [
  {
    id: 'PRD-001',
    name: 'Premium Coffee Beans',
    sku: 'CB-001',
    category: 'Beverages',
    price: 24.99,
    stock: 450,
    minStock: 100,
    status: 'active',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'PRD-002',
    name: 'Organic Tea Set',
    sku: 'TS-002',
    category: 'Beverages',
    price: 35.50,
    stock: 280,
    minStock: 50,
    status: 'active',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'PRD-003',
    name: 'Ceramic Mugs (Set of 4)',
    sku: 'MG-003',
    category: 'Kitchenware',
    price: 45.00,
    stock: 120,
    minStock: 50,
    status: 'active',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'PRD-004',
    name: 'Stainless Steel Water Bottle',
    sku: 'WB-004',
    category: 'Accessories',
    price: 29.99,
    stock: 60,
    minStock: 100,
    status: 'active',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'PRD-005',
    name: 'Bamboo Utensil Set',
    sku: 'BU-005',
    category: 'Kitchenware',
    price: 18.99,
    stock: 220,
    minStock: 75,
    status: 'active',
    createdAt: new Date('2024-02-15'),
  },
];
