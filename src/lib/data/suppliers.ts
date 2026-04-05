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
  {
    id: 'SUP-001',
    name: 'Premium Coffee Imports',
    contact: 'Carlos Mendez - +503 7000-1234',
    email: 'contact@premiumcoffee.com',
    phone: '+1 (555) 111-2222',
    productsSold: ['Premium Coffee Beans', 'Organic Tea Set'],
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
    contact: 'Ana Rivera - +503 7111-2233',
    email: 'sales@globaltea.com',
    phone: '+1 (555) 222-3333',
    productsSold: ['Organic Tea Set'],
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
    contact: 'Jorge Paz - +503 7222-3344',
    email: 'supply@ceramicglass.com',
    phone: '+1 (555) 333-4444',
    productsSold: ['Ceramic Mugs (Set of 4)', 'Bamboo Utensil Set'],
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
    contact: 'Marta Lopez - +503 7333-4455',
    email: 'info@ecomaterials.com',
    phone: '+44 20 7946 0958',
    productsSold: ['Stainless Steel Water Bottle', 'Bamboo Utensil Set'],
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
