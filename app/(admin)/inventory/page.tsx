'use client';

import { useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import DataTable from '@/components/admin/data-table';
import StatusBadge from '@/components/admin/status-badge';
import { inventory, InventoryItem } from '@/lib/data/inventory';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredInventory, setFilteredInventory] = useState(inventory);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = inventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(term) ||
        item.productId.toLowerCase().includes(term) ||
        item.warehouseLocation.toLowerCase().includes(term)
    );
    setFilteredInventory(filtered);
  };

  const criticalItems = inventory.filter((item) => item.status === 'critical');
  const lowItems = inventory.filter((item) => item.status === 'low');

  const columns = [
    {
      header: 'Product',
      accessor: 'productName' as const,
    },
    {
      header: 'Product ID',
      accessor: 'productId' as const,
    },
    {
      header: 'Warehouse Location',
      accessor: 'warehouseLocation' as const,
    },
    {
      header: 'Current Stock',
      accessor: (item: InventoryItem) => (
        <div>
          <p className="font-medium">{item.quantity}</p>
          <p className="text-xs text-slate-500">
            Min: {item.minLevel} | Max: {item.maxLevel}
          </p>
        </div>
      ),
    },
    {
      header: 'Stock Level',
      accessor: (item: InventoryItem) => (
        <div className="w-32 bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              item.status === 'critical'
                ? 'bg-red-500'
                : item.status === 'low'
                  ? 'bg-yellow-500'
                  : item.status === 'overstock'
                    ? 'bg-blue-500'
                    : 'bg-green-500'
            }`}
            style={{
              width: `${Math.min(100, (item.quantity / item.maxLevel) * 100)}%`,
            }}
          />
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (item: InventoryItem) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Last Restocked',
      accessor: (item: InventoryItem) => new Date(item.lastRestocked).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
        <p className="text-slate-500 mt-1">Track and manage product inventory levels</p>
      </div>

      {/* Alerts */}
      {(criticalItems.length > 0 || lowItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {criticalItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Critical Stock Levels</h3>
                <p className="text-sm text-red-700 mt-1">
                  {criticalItems.length} item{criticalItems.length !== 1 ? 's' : ''} need immediate attention
                </p>
              </div>
            </div>
          )}
          {lowItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Low Stock Items</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {lowItems.length} item{lowItems.length !== 1 ? 's' : ''} are running low
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by product name, ID or location..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredInventory} />
    </div>
  );
}
