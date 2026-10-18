'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationBell } from './NotificationBell';

interface TabItem {
  href: string;
  label: string;
  icon: string; // nombre del ícono Material Symbols (igual que en los diseños de Stitch)
}

// Orden y nombres exactos de la tab bar de Stitch (regla global del sistema de diseño).
const adminTabs: TabItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: 'home' },
  { href: '/properties', label: 'Propiedades', icon: 'apartment' },
  { href: '/tenants', label: 'Inquilinos', icon: 'group' },
  { href: '/contracts', label: 'Contratos', icon: 'description' },
  { href: '/payments', label: 'Pagos', icon: 'payments' },
  { href: '/settings', label: 'Más', icon: 'more_horiz' },
];

const tenantTabs: TabItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: 'home' },
  { href: '/profile', label: 'Perfil', icon: 'person' },
  { href: '/settings', label: 'Más', icon: 'grid_view' },
];

// Vistas a pantalla completa sin tab bar (Stitch): conversación de un reporte, flujos
// de asistente y captura del INE — su salida es el botón atrás de cada pantalla.
const FULLSCREEN_ROUTE_PATTERN =
  /^\/(profile\/reports\/[^/]+|tenants\/[^/]+\/reports\/[^/]+|contracts\/new|contracts\/[^/]+\/renew|tenants\/new)$/;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? '';
  const tabs = user?.role === 'ADMIN' ? adminTabs : tenantTabs;
  const isFullscreen = FULLSCREEN_ROUTE_PATTERN.test(pathname);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen flex bg-[#F5F1E8]">
      {/* Escritorio: Stitch sólo diseñó móvil; el sidebar usa la misma paleta y los mismos
          íconos/estados que la tab bar para mantener la concordancia. */}
      <aside className="hidden sm:flex sm:flex-col w-64 shrink-0 sticky top-0 h-screen bg-[#173A5F] text-white">
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link href="/dashboard">
            <BrandLogo size="md" onDark />
          </Link>
          <NotificationBell onDark />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {tabs
            .filter((t) => t.href !== '/settings')
            .map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-semibold transition-colors ${
                    active ? 'bg-white/10 text-[#2D9E6B]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 p-3 border-t border-white/10">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-semibold transition-colors ${
              isActive('/settings') ? 'bg-white/10 text-[#2D9E6B]' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
            Configuración
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-semibold text-red-300 hover:bg-red-500/10 text-left"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* En móvil cada pantalla pinta su propio encabezado azul (como en Stitch). */}
        <main className={`flex-1 w-full ${isFullscreen ? '' : 'pb-20 sm:pb-0'}`}>{children}</main>
      </div>

      {/* Tab bar inferior — markup de Stitch (pantalla "Listado de Contratos"). */}
      {!isFullscreen && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-white border-t border-[#A7B0BB]/30 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
          <div className="w-full max-w-[420px] flex justify-around items-center px-1 py-1.5">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={
                    active
                      ? 'flex flex-col items-center justify-center text-[#2D9E6B] font-semibold py-1 px-2 active:scale-95'
                      : 'flex flex-col items-center justify-center text-[#A7B0BB] py-1 px-2 hover:text-[#173A5F] transition-colors active:scale-95'
                  }
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {tab.icon}
                  </span>
                  <span className="font-sans text-[10px] mt-0.5">{tab.label}</span>
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${active ? 'bg-[#2D9E6B]' : 'bg-transparent'}`}></span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
