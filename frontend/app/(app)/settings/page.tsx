'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, ThemePreference } from '@/lib/themeContext';
import { SunIcon, MoonIcon, DesktopIcon, ChevronRightIcon, UsersIcon, LogoutIcon } from '@/components/icons';

const themeOptions: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Oscuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: DesktopIcon },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">Configuración</h1>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-1">Cuenta</h3>
        <p className="text-sm text-muted mb-4">
          {user?.firstName} {user?.lastName} · {user?.phone}
        </p>
        <p className="text-xs text-muted">Rol: {user?.role === 'ADMIN' ? 'Administrador' : 'Inquilino'}</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <h3 className="text-heading font-semibold mb-4">Apariencia</h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, Icon }) => {
            const active = preference === value;
            return (
              <button
                key={value}
                onClick={() => setPreference(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-black/10 dark:border-white/10 text-muted hover:bg-canvas'
                }`}
              >
                <Icon active={active} className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
          <Link
            href="/settings/representatives"
            className="flex items-center justify-between px-5 py-4 active:bg-canvas transition-colors"
          >
            <div className="flex items-center gap-3">
              <UsersIcon className="w-5 h-5 text-muted" />
              <div>
                <p className="text-heading font-medium text-sm">Representantes</p>
                <p className="text-muted text-xs">Quiénes firman los contratos</p>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-muted" />
          </Link>
        </div>
      )}

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 bg-surface rounded-2xl shadow-sm p-4 text-red-600 dark:text-red-400 font-medium text-sm active:opacity-70 sm:hidden"
      >
        <LogoutIcon className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
