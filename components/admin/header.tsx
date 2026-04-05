'use client';

import { Menu, Bell, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSidebar}
          className="text-slate-600"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="text-sm font-medium text-slate-600">Admin Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="text-slate-600 border-slate-200"
        >
          <Bell className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-slate-600 border-slate-200"
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-slate-600 border-slate-200"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
