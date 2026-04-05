import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import AdminDataBootstrap from '../components/admin/AdminDataBootstrap';

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background p-4 gap-4">
      <AdminDataBootstrap />
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-[0_18px_45px_-30px_rgba(30,41,59,0.45)]">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="min-w-0 min-h-0 flex-1 overflow-y-auto bg-background/70">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
