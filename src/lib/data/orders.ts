export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: Date;
}

export const orders: Order[] = [
  {
    id: 'ORD-001',
    orderNumber: 'ORD-2024-0001',
    customerId: 'CUST-101',
    customerName: 'John Smith',
    amount: 324.50,
    status: 'delivered',
    items: 3,
    date: new Date('2024-03-20'),
  },
  {
    id: 'ORD-002',
    orderNumber: 'ORD-2024-0002',
    customerId: 'CUST-102',
    customerName: 'Sarah Johnson',
    amount: 189.99,
    status: 'shipped',
    items: 2,
    date: new Date('2024-03-22'),
  },
  {
    id: 'ORD-003',
    orderNumber: 'ORD-2024-0003',
    customerId: 'CUST-103',
    customerName: 'Michael Brown',
    amount: 512.75,
    status: 'processing',
    items: 5,
    date: new Date('2024-03-23'),
  },
  {
    id: 'ORD-004',
    orderNumber: 'ORD-2024-0004',
    customerId: 'CUST-104',
    customerName: 'Emma Davis',
    amount: 156.30,
    status: 'pending',
    items: 1,
    date: new Date('2024-03-25'),
  },
  {
    id: 'ORD-005',
    orderNumber: 'ORD-2024-0005',
    customerId: 'CUST-105',
    customerName: 'David Wilson',
    amount: 428.60,
    status: 'delivered',
    items: 4,
    date: new Date('2024-03-24'),
  },
  {
    id: 'ORD-006',
    orderNumber: 'ORD-2024-0006',
    customerId: 'CUST-106',
    customerName: 'Lisa Anderson',
    amount: 278.45,
    status: 'shipped',
    items: 3,
    date: new Date('2024-03-25'),
  },
];
