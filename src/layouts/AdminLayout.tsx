import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import AdminDataBootstrap from '../components/admin/AdminDataBootstrap';
import { useAdmin } from '../context/AdminContext';

export default function AdminLayout() {
  const { state, dispatch } = useAdmin();
  const location = useLocation();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncSidebar = (matches: boolean) => {
      dispatch({ type: 'SET_SIDEBAR', payload: matches });
    };

    syncSidebar(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebar(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [dispatch]);

  useEffect(() => {
    if (window.innerWidth < 1024 && state.sidebarOpen) {
      dispatch({ type: 'SET_SIDEBAR', payload: false });
    }
  }, [dispatch, location.pathname]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background p-2 sm:p-4 lg:gap-4">
      <AdminDataBootstrap />

      {state.sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menu lateral"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
          onClick={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
        />
      )}

      <Sidebar
        onNavigate={() => dispatch({ type: 'SET_SIDEBAR', payload: false })}
        className={`fixed inset-y-0 left-0 z-50 h-[100dvh] w-[280px] max-w-[82vw] rounded-none transition-transform duration-300 lg:static lg:z-auto lg:h-full lg:w-72 lg:max-w-none lg:translate-x-0 ${
          state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      />

      {/* Main Content */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-[0_18px_45px_-30px_rgba(30,41,59,0.45)] lg:ml-0">
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
