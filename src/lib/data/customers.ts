export type CustomerType = 'minorista' | 'mayorista';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  customerType?: CustomerType;
  address: string;
  city: string;
  country: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: Date;
}


