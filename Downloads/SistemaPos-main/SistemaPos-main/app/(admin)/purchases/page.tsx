'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PurchasesPage() {
  const purchaseOrders = [
    {
      id: 'PO-001',
      supplier: 'Premium Coffee Imports',
      items: 'Premium Coffee Beans (50kg)',
      amount: 1200.00,
      date: '2024-03-20',
      status: 'delivered',
    },
    {
      id: 'PO-002',
      supplier: 'Global Tea Distributors',
      items: 'Organic Tea Set (100 units)',
      amount: 3500.00,
      date: '2024-03-22',
      status: 'processing',
    },
    {
      id: 'PO-003',
      supplier: 'Ceramic & Glass Works',
      items: 'Ceramic Mugs (200 units)',
      amount: 900.00,
      date: '2024-03-23',
      status: 'pending',
    },
  ];

  const statusColors = {
    pending: 'text-yellow-700 bg-yellow-100',
    processing: 'text-blue-700 bg-blue-100',
    delivered: 'text-green-700 bg-green-100',
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchases</h1>
          <p className="text-slate-500 mt-1">Track purchase orders from suppliers</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {purchaseOrders.map((po) => (
          <div key={po.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900">{po.id}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[po.status as keyof typeof statusColors]
                    }`}
                  >
                    {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{po.supplier}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Items</p>
                    <p className="text-slate-900 mt-1">{po.items}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Amount</p>
                    <p className="text-slate-900 mt-1 font-semibold">${po.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-semibold">Date</p>
                    <p className="text-slate-900 mt-1">{po.date}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="ml-4">
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
