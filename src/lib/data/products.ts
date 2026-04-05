export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  image?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
}

export const products: Product[] = [
  {
    id: 'PRD-001',
    name: 'Premium Coffee Beans',
    sku: 'CB-001',
    barcode: '7501001000011',
    category: 'Beverages',
    price: 24.99,
    cost: 14.5,
    stock: 450,
    minStock: 100,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop',
    status: 'active',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'PRD-002',
    name: 'Organic Tea Set',
    sku: 'TS-002',
    barcode: '7501001000028',
    category: 'Beverages',
    price: 35.50,
    cost: 19.75,
    stock: 280,
    minStock: 50,
    image: 'https://images.unsplash.com/photo-1594631661960-4d96f7f7b4b6?w=400&auto=format&fit=crop',
    status: 'active',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'PRD-003',
    name: 'Ceramic Mugs (Set of 4)',
    sku: 'MG-003',
    barcode: '7501001000035',
    category: 'Kitchenware',
    price: 45.00,
    cost: 26.3,
    stock: 120,
    minStock: 50,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&auto=format&fit=crop',
    status: 'active',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'PRD-004',
    name: 'Stainless Steel Water Bottle',
    sku: 'WB-004',
    barcode: '7501001000042',
    category: 'Accessories',
    price: 29.99,
    cost: 16.9,
    stock: 60,
    minStock: 100,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&auto=format&fit=crop',
    status: 'active',
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'PRD-005',
    name: 'Bamboo Utensil Set',
    sku: 'BU-005',
    barcode: '7501001000059',
    category: 'Kitchenware',
    price: 18.99,
    cost: 9.65,
    stock: 220,
    minStock: 75,
    image: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f676?w=400&auto=format&fit=crop',
    status: 'active',
    createdAt: new Date('2024-02-15'),
  },
];
