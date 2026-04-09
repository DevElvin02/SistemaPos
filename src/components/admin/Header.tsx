import { Bell, Settings, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '@/context/AdminContext';
import { buildAdminNotifications, formatNotificationTime } from '@/lib/admin-notifications';

interface FloatingPosition {
  top: number;
  left: number;
  width: number;
}

const READ_NOTIFICATIONS_KEY = 'admin_notifications_read';

export default function Header() {
  const { user, logout, isAuthenticated, hasPermission } = useAuth();
  const { state, dispatch } = useAdmin();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [notificationMenuPosition, setNotificationMenuPosition] = useState<FloatingPosition | null>(null);
  const [userMenuPosition, setUserMenuPosition] = useState<FloatingPosition | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setReadNotifications(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      localStorage.removeItem(READ_NOTIFICATIONS_KEY);
    }
  }, []);

  const derivedNotifications = useMemo(
    () => buildAdminNotifications({
      inventory: state.inventory,
      orders: state.orders,
      cashSessions: state.cashSessions,
    }),
    [state.cashSessions, state.inventory, state.orders]
  );

  useEffect(() => {
    const activeIds = new Set(derivedNotifications.map((item) => item.id));
    setReadNotifications((prev) => {
      const next = prev.filter((id) => activeIds.has(id));
      if (next.length !== prev.length) {
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [derivedNotifications]);

  useEffect(() => {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readNotifications));
  }, [readNotifications]);

  const notifications = useMemo(
    () => derivedNotifications.map((item) => ({
      ...item,
      time: formatNotificationTime(item.timestamp),
      unread: !readNotifications.includes(item.id),
    })),
    [derivedNotifications, readNotifications]
  );

  const unreadCount = notifications.filter((item) => item.unread).length;

  const getFloatingPosition = (element: HTMLDivElement | null, width: number) => {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const left = Math.min(Math.max(rect.right - width, padding), viewportWidth - width - padding);

    return {
      top: rect.bottom + 8,
      left,
      width,
    };
  };

  const syncMenuPositions = () => {
    setNotificationMenuPosition(getFloatingPosition(notificationsRef.current, 320));
    setUserMenuPosition(getFloatingPosition(userRef.current, 192));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedNotificationsTrigger = notificationsRef.current?.contains(target);
      const clickedNotificationsMenu = notificationsMenuRef.current?.contains(target);
      const clickedUserTrigger = userRef.current?.contains(target);
      const clickedUserMenu = userMenuRef.current?.contains(target);

      if (!clickedNotificationsTrigger && !clickedNotificationsMenu) {
        setNotificationsOpen(false);
      }

      if (!clickedUserTrigger && !clickedUserMenu) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen && !dropdownOpen) return;

    syncMenuPositions();

    const handleViewportChange = () => syncMenuPositions();

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [notificationsOpen, dropdownOpen]);

  const toggleNotifications = () => {
    setNotificationsOpen((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setTimeout(syncMenuPositions, 0);
      }
      return nextValue;
    });
    setDropdownOpen(false);
  };

  const handleOpenSettings = () => {
    setNotificationsOpen(false);
    setDropdownOpen(false);
    navigate('/settings');
  };

  const markAllAsRead = () => {
    setReadNotifications(notifications.map((item) => item.id));
  };

  const markAsRead = (id: string) => {
    setReadNotifications((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleNotificationClick = (id: string, href: string) => {
    markAsRead(id);
    setNotificationsOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    setNotificationsOpen(false);
    logout();
    navigate('/login', { replace: true });

    window.setTimeout(() => {
      const isDesktopRuntime = window.location.protocol === 'file:';
      const isOnLogin = isDesktopRuntime
        ? window.location.hash.startsWith('#/login')
        : window.location.pathname === '/login';

      if (!isOnLogin) {
        window.location.replace(isDesktopRuntime ? '#/login' : '/login');
      }
    }, 50);
  };

  if (!isAuthenticated || !user) return null;

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return 'bg-destructive/20 text-destructive';
    }
    return 'bg-primary/20 text-primary';
  };

  return (
    <header className="relative z-[70] shrink-0 overflow-visible border-b border-border/70 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted lg:hidden"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-secondary sm:text-2xl lg:text-3xl">
              Motorepuestos <span className="text-primary">POS</span>
            </h2>
            <p className="text-xs text-muted-foreground sm:hidden">
              {user.role === 'admin' ? 'Administrador' : 'Cajero'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={toggleNotifications}
              className="relative rounded-xl p-2.5 text-foreground transition hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {hasPermission('settings.view') && (
            <button
              onClick={handleOpenSettings}
              className="hidden rounded-xl p-2.5 text-foreground transition hover:bg-muted sm:inline-flex"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <div className="hidden h-8 w-px bg-border sm:block" />

          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setDropdownOpen((prev) => {
                  const nextValue = !prev;
                  if (nextValue) {
                    setTimeout(syncMenuPositions, 0);
                  }
                  return nextValue;
                });
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-muted sm:gap-3 sm:px-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="hidden text-left sm:block">
                  <div className="max-w-[150px] truncate text-sm font-medium text-foreground">{user.name}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(user.role)}`}>
                    {user.role === 'admin' ? 'Administrador' : 'Cajero'}
                  </div>
                </div>
              </div>
              <ChevronDown className="hidden w-4 h-4 text-muted-foreground sm:block" />
            </button>
          </div>
        </div>
      </div>

      {notificationsOpen && notificationMenuPosition && createPortal(
        <div
          ref={notificationsMenuRef}
          className="fixed border border-border rounded-lg shadow-lg z-[140] overflow-hidden bg-card"
          style={{
            top: notificationMenuPosition.top,
            left: notificationMenuPosition.left,
            width: notificationMenuPosition.width,
          }}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Marcar todo leido
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto bg-card">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No hay notificaciones activas por ahora.
              </div>
            ) : notifications.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNotificationClick(item.id, item.href)}
                className="w-full text-left px-4 py-3 border-b last:border-b-0 border-border hover:bg-muted/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">{item.time}</p>
                  </div>
                  {item.unread && <span className="mt-1 w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {dropdownOpen && userMenuPosition && createPortal(
        <div
          ref={userMenuRef}
          className="fixed w-48 bg-card border border-border rounded-lg shadow-lg z-[140] overflow-hidden"
          style={{
            top: userMenuPosition.top,
            left: userMenuPosition.left,
          }}
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-medium text-foreground">{user.email}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Ultimo acceso: {user.ultimoLogin ? new Date(user.ultimoLogin).toLocaleDateString('es-ES') : 'N/A'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition text-left"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesion
          </button>
        </div>,
        document.body
      )}
    </header>
  );
}
