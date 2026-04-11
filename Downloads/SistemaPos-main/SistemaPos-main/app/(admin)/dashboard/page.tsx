'use client';

import { ShoppingCart, Users, Package, TrendingUp } from 'lucide-react';
import StatCard from '@/components/admin/stat-card';
import { orders } from '@/lib/data/orders';
import { customers } from '@/lib/data/customers';
import { products } from '@/lib/data/products';
import { inventory } from '@/lib/data/inventory';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const chartData = [
  { month: 'Jan', orders: 320, revenue: 2400, customers: 45 },
  { month: 'Feb', orders: 380, revenue: 2210, customers: 52 },
  { month: 'Mar', orders: 290, revenue: 2290, customers: 38 },
  { month: 'Apr', orders: 450, revenue: 2000, customers: 65 },
  { month: 'May', orders: 520, revenue: 2181, customers: 71 },
  { month: 'Jun', orders: 480, revenue: 2500, customers: 68 },
];

const lowStockItems = inventory.filter((item) => item.status === 'low' || item.status === 'critical');

export default function DashboardPage() {
  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const activeProducts = products.filter((p) => p.status === 'active').length;
  const lowStockCount = lowStockItems.length;

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={TrendingUp}
          trend={{ value: 12.5, label: 'vs last month', isPositive: true }}
        />
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingCart}
          trend={{ value: 8.2, label: 'vs last month', isPositive: true }}
        />
        <StatCard
          title="Active Customers"
          value={customers.length}
          icon={Users}
          trend={{ value: 3.5, label: 'vs last month', isPositive: true }}
        />
        <StatCard
          title="Active Products"
          value={activeProducts}
          icon={Package}
          subtitle={`${lowStockCount} low stock items`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders vs Customers */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Orders & Customers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                dot={{ fill: '#3b82f6' }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="#10b981"
                dot={{ fill: '#10b981' }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Monthly Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="customers" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg border border-yellow-200 p-6 shadow-sm bg-yellow-50">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3">Items Running Low on Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-lg border border-yellow-200">
                <p className="font-medium text-slate-900">{item.productName}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Current: <span className="font-semibold">{item.quantity}</span> | Min: {item.minLevel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
