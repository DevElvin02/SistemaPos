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
  
];
