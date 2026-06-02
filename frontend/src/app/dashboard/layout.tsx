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

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Tiket (Kanban)', href: '/dashboard/tickets', icon: KanbanSquare, exact: true },
  { name: 'Riwayat Tiket', href: '/dashboard/tickets/history', icon: History },
  { name: 'Gedung', href: '/dashboard/buildings', icon: Building2 },
  { name: 'Kategori', href: '/dashboard/categories', icon: Tags },
  { name: 'Teknisi', href: '/dashboard/technicians', icon: Users },
  { name: 'Devices', href: '/dashboard/devices', icon: Smartphone },
  { name: 'QR Generator', href: '/dashboard/qr-generator', icon: QrCode },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, checkAuth, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAVIGATION.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {!isSidebarCollapsed && item.name}
              </Link>
            );
          })}
        </div>

        <div className={`p-4 border-t border-slate-100 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs" title={user?.name || 'Admin'}>
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 text-red-500 flex-shrink-0" />
            {!isSidebarCollapsed && 'Logout'}
          </button>
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
