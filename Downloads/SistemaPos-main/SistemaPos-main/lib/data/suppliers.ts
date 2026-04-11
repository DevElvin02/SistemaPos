export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  {
    id: 'SUP-001',
    name: 'Premium Coffee Imports',
    email: 'contact@premiumcoffee.com',
    phone: '+1 (555) 111-2222',
    website: 'www.premiumcoffee.com',
    address: '100 Commerce Street',
    city: 'Seattle',
    country: 'USA',
    status: 'active',
    totalOrders: 24,
    rating: 4.8,
    paymentTerms: 'Net 30',
    joinDate: new Date('2022-06-10'),
  },
  {
    id: 'SUP-002',
    name: 'Global Tea Distributors',
    email: 'sales@globaltea.com',
    phone: '+1 (555) 222-3333',
    website: 'www.globaltea.com',
    address: '200 Trade Avenue',
    city: 'Portland',
    country: 'USA',
    status: 'active',
    totalOrders: 18,
    rating: 4.6,
    paymentTerms: 'Net 45',
    joinDate: new Date('2022-09-15'),
  },
  {
    id: 'SUP-003',
    name: 'Ceramic & Glass Works',
    email: 'supply@ceramicglass.com',
    phone: '+1 (555) 333-4444',
    website: 'www.ceramicglass.com',
    address: '300 Factory Lane',
    city: 'Cleveland',
    country: 'USA',
    status: 'active',
    totalOrders: 12,
    rating: 4.4,
    paymentTerms: 'Net 30',
    joinDate: new Date('2023-01-20'),
  },
  {
    id: 'SUP-004',
    name: 'Eco Materials Ltd',
    email: 'info@ecomaterials.com',
    phone: '+44 20 7946 0958',
    website: 'www.ecomaterials.com',
    address: '400 Green Park',
    city: 'London',
    country: 'UK',
    status: 'active',
    totalOrders: 8,
    rating: 4.7,
    paymentTerms: 'Net 60',
    joinDate: new Date('2023-04-10'),
  },
];
