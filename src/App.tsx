import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Customers from './pages/admin/Customers';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Suppliers from './pages/admin/Suppliers';
import Inventory from './pages/admin/Inventory';
import Purchases from './pages/admin/Purchases';
import Reports from './pages/admin/Reports';
import CashRegister from './pages/admin/CashRegister';
import Tickets from './pages/admin/Tickets';
import Alerts from './pages/admin/Alerts';
import Settings from './pages/admin/Settings';
import Users from './pages/admin/Users';
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/auth/Unauthorized';

const initialState = {
  orders: [],
  customers: [],
  products: [],
  categories: [],
  suppliers: [],
  purchases: [],
  inventory: [],
  kardex: [],
  cashSessions: [],
  sidebarOpen: true,
};

function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <AdminProvider initialState={initialState}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/cash" element={<CashRegister />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<ProtectedRoute requiredRoles={['admin']}><Users /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredRoles={['admin']}><Settings /></ProtectedRoute>} />
            </Route>
          </Routes>
        </AdminProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
