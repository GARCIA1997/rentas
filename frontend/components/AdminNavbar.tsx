'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/properties', label: 'Propiedades' },
  { href: '/admin/tenants', label: 'Inquilinos' },
  { href: '/admin/representatives', label: 'Representantes' },
  { href: '/admin/contracts', label: 'Contratos' },
];

export function AdminNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="bg-surface border-b border-black/5 dark:border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          <div className="flex items-center gap-8 overflow-x-auto">
            <Link href="/dashboard" className="shrink-0 flex items-center">
              <Image src="/logoksa.png" alt="KsaRed" width={40} height={40} className="h-10 w-10" priority />
            </Link>
            {user?.role === 'ADMIN' && (
              <div className="hidden sm:flex items-center gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                      pathname === link.href
                        ? 'bg-primary text-white'
                        : 'text-muted hover:bg-canvas'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <span className="hidden md:inline text-sm text-muted">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex sm:hidden items-center gap-1 pb-2 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === link.href ? 'bg-primary text-white' : 'text-muted hover:bg-canvas'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
