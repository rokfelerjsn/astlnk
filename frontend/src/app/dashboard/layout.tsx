'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, KanbanSquare, Building2, DoorOpen, 
  Tags, Users, QrCode, LogOut, Wrench, Menu, X, Loader2,
  PanelLeftClose, PanelLeftOpen, History, Smartphone
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useState } from 'react';

interface NavChild {
  name: string;
  href: string;
  icon: any;
  exact?: boolean;
}

interface NavItem {
  name: string;
  href?: string;
  icon?: any;
  exact?: boolean;
  children?: NavChild[];
}

const NAVIGATION: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    exact: true 
  },
  { 
    name: 'Manajemen Tiket', 
    children: [
      { name: 'Tiket (Kanban)', href: '/dashboard/tickets', icon: KanbanSquare, exact: true },
      { name: 'Riwayat Tiket', href: '/dashboard/tickets/history', icon: History },
    ]
  },
  { 
    name: 'Master Data', 
    children: [
      { name: 'Gedung', href: '/dashboard/buildings', icon: Building2 },
      { name: 'Kategori', href: '/dashboard/categories', icon: Tags },
      { name: 'Teknisi', href: '/dashboard/technicians', icon: Users },
    ]
  },
  { 
    name: 'Alat & Integrasi', 
    children: [
      { name: 'Devices', href: '/dashboard/devices', icon: Smartphone },
      { name: 'QR Generator', href: '/dashboard/qr-generator', icon: QrCode },
    ]
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, checkAuth, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isChildActive = (child: NavChild) => {
    return child.exact
      ? pathname === child.href
      : pathname === child.href || pathname?.startsWith(`${child.href}/`);
  };

  const isCategoryActive = (item: NavItem) => {
    if (item.href) {
      return item.exact
        ? pathname === item.href
        : pathname === item.href || pathname?.startsWith(`${item.href}/`);
    }
    if (item.children) {
      return item.children.some((child) => isChildActive(child));
    }
    return false;
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-200 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 ${isSidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'} w-64`}>
        <div className={`h-16 flex items-center gap-3 border-b border-slate-100 ${isSidebarCollapsed ? 'px-3 justify-center' : 'px-6'}`}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-bold text-slate-900 text-lg">AsetLink</span>
          )}
          <button 
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAVIGATION.map((item) => {
            const isActive = isCategoryActive(item);

            if (item.href) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && item.name}
                </Link>
              );
            }

            // Category item with children (always open / static group)
            return (
              <div key={item.name} className="space-y-1 pt-1">
                {isSidebarCollapsed ? (
                  <div className="border-t border-slate-100 my-2" />
                ) : (
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                    {item.name}
                  </div>
                )}
                
                {/* Submenu items */}
                <div className="space-y-1">
                  {item.children?.map((child) => {
                    const isSubActive = isChildActive(child);
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={() => setIsSidebarOpen(false)}
                        title={isSidebarCollapsed ? child.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isSubActive 
                            ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <child.icon className={`w-5 h-5 flex-shrink-0 ${isSubActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {!isSidebarCollapsed && <span className="truncate">{child.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 border-t border-slate-100 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0 focus:outline-none"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                title={`Logout (${user?.name || 'Admin'})`}
                className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 hover:bg-red-100 hover:text-red-700 font-bold text-xs transition-colors cursor-pointer group focus:outline-none"
              >
                <span className="group-hover:hidden">{user?.name?.charAt(0) || 'A'}</span>
                <LogOut className="w-4 h-4 hidden group-hover:block text-red-600" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
          {/* Mobile menu button */}
          <button 
            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Desktop sidebar toggle */}
          <button 
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden lg:flex items-center"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <span className="font-bold text-slate-900 ml-2 lg:hidden">AsetLink Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
