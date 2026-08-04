'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HomeIcon, BuildingIcon, UsersIcon, DocumentIcon, CashIcon, MoreIcon, UserCircleIcon } from './icons';

interface TabItem {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
}

const adminTabs: TabItem[] = [
  { href: '/dashboard', label: 'Inicio', Icon: HomeIcon },
  { href: '/properties', label: 'Propiedades', Icon: BuildingIcon },
  { href: '/tenants', label: 'Inquilinos', Icon: UsersIcon },
  { href: '/contracts', label: 'Contratos', Icon: DocumentIcon },
  { href: '/payments', label: 'Pagos', Icon: CashIcon },
  { href: '/settings', label: 'Más', Icon: MoreIcon },
];

const tenantTabs: TabItem[] = [
  { href: '/dashboard', label: 'Inicio', Icon: HomeIcon },
  { href: '/profile', label: 'Perfil', Icon: UserCircleIcon },
  { href: '/settings', label: 'Más', Icon: MoreIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const tabs = user?.role === 'ADMIN' ? adminTabs : tenantTabs;

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Desktop sidebar — floating glass panel, inset from the edges */}
      <aside className="hidden sm:flex sm:flex-col w-64 shrink-0 p-3 sticky top-0 h-screen">
        <div className="glass-chrome flex flex-col flex-1 rounded-[28px] p-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 mb-6 px-2 pt-1">
            <Image src="/iconksa.png" alt="KsaRed" width={32} height={32} className="h-8 w-8 rounded-[10px] shrink-0" priority />
            <span className="font-semibold text-lg text-heading tracking-tight">KsaRed</span>
          </Link>

          <nav className="flex flex-col gap-1">
            {tabs
              .filter((t) => t.href !== '/settings')
              .map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                      active
                        ? 'text-primary bg-primary/12 dark:bg-primary/18'
                        : 'text-muted hover:bg-black/[0.03] dark:hover:bg-white/[0.06] hover:text-heading'
                    }`}
                  >
                    <tab.Icon active={active} className="w-5 h-5 shrink-0" />
                    {tab.label}
                  </Link>
                );
              })}
          </nav>

          <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                isActive('/settings')
                  ? 'text-primary bg-primary/12 dark:bg-primary/18'
                  : 'text-muted hover:bg-black/[0.03] dark:hover:bg-white/[0.06] hover:text-heading'
              }`}
            >
              <MoreIcon active={isActive('/settings')} className="w-5 h-5 shrink-0" />
              Configuración
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="sm:hidden sticky top-0 z-20 glass-chrome pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/iconksa.png" alt="KsaRed" width={28} height={28} className="h-7 w-7 rounded-[8px]" priority />
              <span className="font-semibold text-heading tracking-tight">KsaRed</span>
            </Link>
            <span className="text-sm text-muted truncate max-w-[40%]">{user?.firstName}</span>
          </div>
        </header>

        <main className="flex-1 pb-28 sm:pb-8 px-4 sm:px-8 py-4 sm:py-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — floating glass capsule, inset from the edges */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="glass-chrome flex items-stretch h-16 rounded-full px-1.5 mx-auto max-w-md">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity"
              >
                <span
                  className={`flex items-center justify-center w-11 h-7 rounded-full transition-all ${
                    active ? 'bg-primary/15 dark:bg-primary/25 animate-pill-in' : ''
                  }`}
                >
                  <tab.Icon active={active} className={`w-[22px] h-[22px] ${active ? 'text-primary' : 'text-muted'}`} />
                </span>
                <span className={`text-[10px] leading-none ${active ? 'text-primary font-semibold' : 'text-muted'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
