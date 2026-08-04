'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HomeIcon, BuildingIcon, UsersIcon, DocumentIcon, MoreIcon, UserCircleIcon } from './icons';

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
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex sm:flex-col w-60 shrink-0 border-r border-black/5 dark:border-white/10 bg-surface p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 mb-8 px-2 pt-1">
          <Image src="/iconksa.png" alt="KsaRed" width={32} height={32} className="h-8 w-8 rounded-lg shrink-0" priority />
          <span className="font-semibold text-lg text-heading">KsaRed</span>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-heading'
                  }`}
                >
                  <tab.Icon active={active} className="w-5 h-5 shrink-0" />
                  {tab.label}
                </Link>
              );
            })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-black/5 dark:border-white/10">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive('/settings') ? 'bg-primary text-white' : 'text-muted hover:bg-canvas hover:text-heading'
            }`}
          >
            <MoreIcon active={isActive('/settings')} className="w-5 h-5 shrink-0" />
            Configuración
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="sm:hidden sticky top-0 z-20 bg-surface/85 backdrop-blur-md border-b border-black/5 dark:border-white/10 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/iconksa.png" alt="KsaRed" width={28} height={28} className="h-7 w-7 rounded-lg" priority />
              <span className="font-semibold text-heading">KsaRed</span>
            </Link>
            <span className="text-sm text-muted truncate max-w-[40%]">{user?.firstName}</span>
          </div>
        </header>

        <main className="flex-1 pb-24 sm:pb-8 px-4 sm:px-8 py-4 sm:py-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur-md border-t border-black/5 dark:border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition-opacity"
              >
                <tab.Icon active={active} className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted'}`} />
                <span className={`text-[11px] leading-none ${active ? 'text-primary font-medium' : 'text-muted'}`}>
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
