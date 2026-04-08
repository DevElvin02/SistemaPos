export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  country: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: Date;
}


