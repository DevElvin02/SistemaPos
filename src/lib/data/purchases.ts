export interface PurchaseLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  lines: PurchaseLine[];
  items: number;
  amount: number;
  date: Date;
}

export const purchases: Purchase[] = [];
