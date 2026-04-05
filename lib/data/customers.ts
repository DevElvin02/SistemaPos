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

export const customers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    company: 'Smith Industries',
    address: '123 Main Street',
    city: 'New York',
    country: 'USA',
    totalOrders: 12,
    totalSpent: 3450.75,
    status: 'active',
    joinDate: new Date('2023-01-15'),
  },
  {
    id: 'CUST-002',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 234-5678',
    company: 'Johnson Corp',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    country: 'USA',
    totalOrders: 8,
    totalSpent: 2180.50,
    status: 'active',
    joinDate: new Date('2023-03-22'),
  },
  {
    id: 'CUST-003',
    name: 'Michael Brown',
    email: 'm.brown@example.com',
    phone: '+1 (555) 345-6789',
    company: 'Brown & Associates',
    address: '789 Pine Road',
    city: 'Chicago',
    country: 'USA',
    totalOrders: 15,
    totalSpent: 5620.00,
    status: 'active',
    joinDate: new Date('2022-11-08'),
  },
  {
    id: 'CUST-004',
    name: 'Emma Davis',
    email: 'emma.davis@example.com',
    phone: '+1 (555) 456-7890',
    address: '321 Elm Street',
    city: 'Houston',
    country: 'USA',
    totalOrders: 5,
    totalSpent: 890.25,
    status: 'active',
    joinDate: new Date('2024-01-20'),
  },
  {
    id: 'CUST-005',
    name: 'David Wilson',
    email: 'david.w@example.com',
    phone: '+1 (555) 567-8901',
    company: 'Wilson Global',
    address: '654 Maple Drive',
    city: 'Phoenix',
    country: 'USA',
    totalOrders: 10,
    totalSpent: 2945.80,
    status: 'active',
    joinDate: new Date('2023-06-15'),
  },
];
