export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  productsSold: string[];
  website?: string;
  address: string;
  city: string;
  country: string;
  status: 'active' | 'inactive' | 'pending';
  totalOrders: number;
  rating: number;
  paymentTerms: string;
  joinDate: Date;
}

export const suppliers: Supplier[] = [
  
];
