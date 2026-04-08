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
  
];
