'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationBell } from '@/components/NotificationBell';

// Encabezado azul de los diseños de Stitch. En escritorio se oculta la fila del logo
// (ya está en el sidebar) pero se conserva el contenido propio de cada pantalla.
function Avatar() {
  const { user } = useAuth();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'KS';
  return (
    <div className="relative flex items-center">
      <span className="w-9 h-9 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-xs font-bold text-white">
        {initials}
      </span>
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2D9E6B] border-2 border-[#173A5F] rounded-full"></span>
    </div>
  );
}

/** Variante principal (Inicio, listados): logo + campana + avatar, con contenido debajo. */
export function MainHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="bg-[#173A5F] text-white pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 relative">
      <div className="max-w-md sm:max-w-5xl mx-auto">
        <div className="flex items-center justify-between sm:hidden">
          <Link href="/dashboard" className="flex items-center">
            <BrandLogo size="sm" onDark />
          </Link>
          <div className="flex items-center space-x-2.5">
            <NotificationBell onDark />
            <Avatar />
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

/** Variante de detalle: flecha atrás + título blanco (+ subtítulo y acciones opcionales). */
export function DetailHeader({
  title,
  subtitle,
  backHref,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="bg-[#173A5F] text-white sticky top-0 z-40 w-full px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
      <div className="max-w-md sm:max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Volver"
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              className="text-white hover:opacity-80 active:scale-95 transition-all p-1 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-sans font-semibold text-base text-white leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-[11px] text-white/70 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}
