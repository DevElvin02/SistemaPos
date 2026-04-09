import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';
import Unauthorized from './pages/auth/Unauthorized';

// Performance: divide rutas administrativas pesadas para priorizar el primer render.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Products = lazy(() => import('./pages/admin/Products'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const Suppliers = lazy(() => import('./pages/admin/Suppliers'));
const Inventory = lazy(() => import('./pages/admin/Inventory'));
const Purchases = lazy(() => import('./pages/admin/Purchases'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const CashRegister = lazy(() => import('./pages/admin/CashRegister'));
const Tickets = lazy(() => import('./pages/admin/Tickets'));
const Alerts = lazy(() => import('./pages/admin/Alerts'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Users = lazy(() => import('./pages/admin/Users'));

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
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
};

function RouteSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Performance: placeholder rapido para evitar pantallas en blanco mientras carga el chunk. */}
      <div className="mb-6 h-8 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

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
              <Route path="/dashboard" element={<Suspense fallback={<RouteSkeleton />}><Dashboard /></Suspense>} />
              <Route path="/orders" element={<Suspense fallback={<RouteSkeleton />}><Orders /></Suspense>} />
              <Route path="/customers" element={<Suspense fallback={<RouteSkeleton />}><Customers /></Suspense>} />
              <Route path="/products" element={<Suspense fallback={<RouteSkeleton />}><Products /></Suspense>} />
              <Route path="/categories" element={<Suspense fallback={<RouteSkeleton />}><Categories /></Suspense>} />
              <Route path="/suppliers" element={<Suspense fallback={<RouteSkeleton />}><Suppliers /></Suspense>} />
              <Route path="/inventory" element={<Suspense fallback={<RouteSkeleton />}><Inventory /></Suspense>} />
              <Route path="/purchases" element={<Suspense fallback={<RouteSkeleton />}><Purchases /></Suspense>} />
              <Route path="/cash" element={<Suspense fallback={<RouteSkeleton />}><CashRegister /></Suspense>} />
              <Route path="/tickets" element={<Suspense fallback={<RouteSkeleton />}><Tickets /></Suspense>} />
              <Route path="/alerts" element={<Suspense fallback={<RouteSkeleton />}><Alerts /></Suspense>} />
              <Route path="/reports" element={<Suspense fallback={<RouteSkeleton />}><Reports /></Suspense>} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <Suspense fallback={<RouteSkeleton />}>
                      <Users />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <Suspense fallback={<RouteSkeleton />}>
                      <Settings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </AdminProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
