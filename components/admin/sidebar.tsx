'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  ShoppingCart,
  Users,
  Package,
  Truck,
  Boxes,
  FileText,
  Settings,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const navGroups: NavGroup[] = [
    {
      label: 'Main',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: <LayoutGrid className="w-5 h-5" />,
        },
      ],
    },
    {
      label: 'Business',
      items: [
        {
          name: 'Orders',
          href: '/orders',
          icon: <ShoppingCart className="w-5 h-5" />,
        },
        {
          name: 'Customers',
          href: '/customers',
          icon: <Users className="w-5 h-5" />,
        },
        {
          name: 'Products',
          href: '/products',
          icon: <Package className="w-5 h-5" />,
        },
        {
          name: 'Suppliers',
          href: '/suppliers',
          icon: <Truck className="w-5 h-5" />,
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          name: 'Inventory',
          href: '/inventory',
          icon: <Boxes className="w-5 h-5" />,
        },
        {
          name: 'Purchases',
          href: '/purchases',
          icon: <FileText className="w-5 h-5" />,
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: <FileText className="w-5 h-5" />,
        },
      ],
    },
    {
      label: 'System',
      items: [
        {
          name: 'Settings',
          href: '/settings',
          icon: <Settings className="w-5 h-5" />,
        },
      ],
    },
  ];

  const isItemActive = (href: string) => {
    return pathname?.includes(href);
  };

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-center p-6 border-b border-slate-700">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h1 className="font-bold text-lg">Sublimart</h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            {isOpen && (
              <h3 className="px-4 pt-6 pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.label}
              </h3>
            )}
            <div className="space-y-2 px-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isItemActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isOpen ? '' : item.name}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isOpen && <span className="truncate">{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        {isOpen && (
          <div className="text-xs text-slate-400">
            <p className="font-semibold">Sublimart Admin</p>
            <p>v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}
