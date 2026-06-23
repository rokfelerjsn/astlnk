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
      <aside className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-slate-300 border-r border-slate-800/80 transform transition-all duration-200 ease-in-out flex flex-col overflow-hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 ${isSidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'} w-64`}>
        {/* Glow Effects */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-[70px] pointer-events-none" />

        <div className={`h-16 flex items-center gap-3 border-b border-slate-800/80 relative z-10 ${isSidebarCollapsed ? 'px-3 justify-center' : 'px-6'}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-bold text-white tracking-wide text-lg">AsetLink</span>
          )}
          <button 
            className="ml-auto lg:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 relative z-10">
          {NAVIGATION.map((item) => {
            const isActive = isCategoryActive(item);

            if (item.href) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-900/30' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!isSidebarCollapsed && item.name}
                </Link>
              );
            }

            // Category item with children (always open / static group)
            return (
              <div key={item.name} className="space-y-1 pt-1">
                {isSidebarCollapsed ? (
                  <div className="border-t border-slate-800/80 my-2" />
                ) : (
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase select-none">
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
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isSubActive 
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-900/30' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <child.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isSubActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        {!isSidebarCollapsed && <span className="truncate">{child.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`p-4 border-t border-slate-800/80 relative z-10 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer shrink-0 focus:outline-none"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                title={`Logout (${user?.name || 'Admin'})`}
                className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 hover:bg-red-950/40 hover:text-red-400 font-bold text-xs transition-colors cursor-pointer group focus:outline-none"
              >
                <span className="group-hover:hidden">{user?.name?.charAt(0) || 'A'}</span>
                <LogOut className="w-4 h-4 hidden group-hover:block text-red-400" />
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
