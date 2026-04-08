import { useLocation, Link } from 'react-router-dom';
import {
  LayoutGrid,
  ShoppingCart,
  Users,
  Package,
  Tag,
  Truck,
  Boxes,
  FileText,
  Settings,
  Shield,
  DollarSign,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar() {
  const location = useLocation();
  const { user, hasPermission } = useAuth();

  const navGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutGrid className="w-5 h-5" />,
          permission: 'orders.view',
        },
      ],
    },
    {
      label: 'Negocio',
      items: [
        {
          name: 'Gestión de Ventas',
          href: '/orders',
          icon: <ShoppingCart className="w-5 h-5" />,
          permission: 'orders.view',
        },
        {
          name: 'Clientes',
          href: '/customers',
          icon: <Users className="w-5 h-5" />,
          permission: 'customers.view',
        },
        {
          name: 'Productos',
          href: '/products',
          icon: <Package className="w-5 h-5" />,
          permission: 'products.view',
        },
        {
          name: 'Categorias',
          href: '/categories',
          icon: <Tag className="w-5 h-5" />,
          permission: 'categories.view',
        },
        {
          name: 'Proveedores',
          href: '/suppliers',
          icon: <Truck className="w-5 h-5" />,
          permission: 'suppliers.view',
        },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        {
          name: 'Caja',
          href: '/cash',
          icon: <DollarSign className="w-5 h-5" />,
          permission: 'orders.view',
        },
        {
          name: 'Tickets',
          href: '/tickets',
          icon: <FileText className="w-5 h-5" />,
          permission: 'orders.view',
        },
        {
          name: 'Alertas',
          href: '/alerts',
          icon: <Bell className="w-5 h-5" />,
          permission: 'orders.view',
        },
        {
          name: 'Inventario',
          href: '/inventory',
          icon: <Boxes className="w-5 h-5" />,
          permission: 'inventory.view',
        },
        {
          name: 'Compras',
          href: '/purchases',
          icon: <FileText className="w-5 h-5" />,
          permission: 'purchases.view',
        },
        {
          name: 'Reportes',
          href: '/reports',
          icon: <FileText className="w-5 h-5" />,
          permission: 'reports.view',
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          name: 'Configuración',
          href: '/settings',
          icon: <Settings className="w-5 h-5" />,
          permission: 'settings.view',
        },
        {
          name: 'Usuarios',
          href: '/users',
          icon: <Shield className="w-5 h-5" />,
          permission: 'users.manage',
        },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    return location.pathname.includes(href);
  };

  // Filtrar items según permisos del usuario
  const filteredNavGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.permission)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside className="w-72 flex flex-col h-full rounded-2xl overflow-hidden border border-sidebar-border/70 bg-[linear-gradient(180deg,#1E293B_0%,#162334_45%,#111C2B_100%)] text-sidebar-foreground shadow-[0_20px_50px_-28px_rgba(15,23,42,0.9)]">
      {/* Logo */}
      <div className="flex items-center px-5 py-5 border-b border-sidebar-border/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center font-bold text-lg text-sidebar-primary-foreground shadow-sm">
            S
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Motorepuestos</h1>
            <p className="text-xs text-sidebar-foreground/70">
              {user?.role === 'admin' ? 'Administrador' : 'Cajero'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredNavGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <h3 className="px-5 pt-4 pb-2 text-[11px] font-semibold text-sidebar-foreground/55 uppercase tracking-[0.14em]">
              {group.label}
            </h3>
            <div className="space-y-1 px-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                    isItemActive(item.href)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[inset_0_0_0_1px_rgba(248,250,252,0.08)]'
                      : 'text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/70'
                  }`}
                >
                  <span className="flex-shrink-0 opacity-95">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/70 p-4">
        <div className="text-xs text-sidebar-foreground/65">
          <p className="font-semibold text-sidebar-foreground">Motorepuestos POS</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
