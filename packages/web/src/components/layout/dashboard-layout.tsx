'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  FileText,
  Shield,
  Package,
  CreditCard,
  Languages,
  LogOut,
  UserCog,
  Settings,
  UserCircle2,
  CalendarDays,
  Key,
} from 'lucide-react';
import { useLocale } from '@/providers/locale-provider';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, isRTL, toggleLocale, t } = useLocale();

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    setUserName(localStorage.getItem('userName') ?? '');
    setUserRole(localStorage.getItem('userRole') ?? '');
  }, []);

  // Role display label
  const roleLabel = (t.users.roles as Record<string, string>)[userRole] ?? userRole;

  const isDriver = userRole === 'DRIVER';

  const managerNavItems = [
    { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { path: '/dashboard/vehicles', label: t.nav.vehicles, icon: Truck },
    { path: '/dashboard/drivers', label: t.nav.drivers, icon: Users },
    { path: '/dashboard/trips', label: t.nav.trips, icon: Route },
    { path: '/dashboard/maintenance', label: t.nav.maintenance, icon: Wrench },
    { path: '/dashboard/fuel', label: t.nav.fuel, icon: Fuel },
    { path: '/dashboard/operation-cards', label: t.nav.operationCards, icon: CreditCard },
    { path: '/dashboard/tamm', label: t.nav.tamm, icon: Shield },
    { path: '/dashboard/naql', label: t.nav.naql, icon: Package },
    { path: '/dashboard/contracts', label: t.nav.contracts, icon: CalendarDays },
    { path: '/dashboard/rentals', label: t.nav.rentals, icon: Key },
    { path: '/dashboard/documents', label: t.nav.documents, icon: FileText },
    { path: '/dashboard/users', label: t.nav.users, icon: UserCog },
    { path: '/dashboard/settings', label: t.nav.settings, icon: Settings },
  ];

  const driverNavItems = [
    { path: '/dashboard/trips', label: t.nav.trips, icon: Route },
    { path: '/dashboard/settings', label: t.nav.settings, icon: Settings },
  ];

  const navItems = isDriver ? driverNavItems : managerNavItems;

  const normalizedPath = (pathname || '/').replace(/^\/(ar|en)(?=\/|$)/, '') || '/';

  useEffect(() => {
    if (!isDriver) return;
    const allowedDriverPrefixes = ['/dashboard/trips', '/dashboard/settings'];
    const isAllowed = allowedDriverPrefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));
    if (!isAllowed) {
      router.replace(`/${locale}/dashboard/trips`);
    }
  }, [isDriver, normalizedPath, locale, router]);

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = `/${locale}/login`;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`w-60 bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Truck className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-900 text-lg ms-2">{t.common.brandName}</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const href = `/${locale}${item.path}`;
            const active =
              item.path === '/dashboard'
                ? normalizedPath === '/dashboard'
                : normalizedPath.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {t.common.languageLabel}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.common.logout}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 flex-shrink-0">
          <Link
            href={`/${locale}/dashboard/settings`}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors group"
          >
            <div className="text-end">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{userName || '—'}</p>
              <p className="text-xs text-gray-500 leading-tight">{roleLabel}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
