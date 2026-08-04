'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, ThemePreference } from '@/lib/themeContext';
import { useToast } from '@/components/ToastProvider';
import { SunIcon, MoonIcon, DesktopIcon, ChevronRightIcon, UsersIcon, LogoutIcon, BellIcon } from '@/components/icons';
import { apiCall } from '@/lib/api';

const themeOptions: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Oscuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: DesktopIcon },
];

export default function SettingsPage() {
  const { user, logout, token } = useAuth();
  const { preference, setPreference } = useTheme();
  const { showToast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!token) return;
      try {
        const settings = (await apiCall('/api/me/settings', { token })) as { notificationsEnabled?: boolean };
        setNotificationsEnabled(settings.notificationsEnabled ?? true);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setNotificationsEnabled(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [token]);

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!token) return;
    setNotificationsEnabled(enabled);
    try {
      await apiCall('/api/me/settings', {
        token,
        method: 'PUT',
        body: JSON.stringify({ notificationsEnabled: enabled }),
      });
      showToast(
        enabled ? 'Notificaciones habilitadas' : 'Notificaciones deshabilitadas',
        'success'
      );
    } catch (err) {
      setNotificationsEnabled(!enabled);
      showToast('Error al actualizar configuración', 'error');
    }
  };

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

      <div className="bg-surface rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <BellIcon className="w-5 h-5 text-muted" />
            <div>
              <p className="text-heading font-medium text-sm">Notificaciones</p>
              <p className="text-muted text-xs">Recibir alertas de pagos y contratos</p>
            </div>
          </div>
          <button
            onClick={() => handleNotificationsToggle(!notificationsEnabled)}
            disabled={isLoading}
            className={`w-12 h-7 rounded-full transition-colors ${
              notificationsEnabled ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'
            } relative disabled:opacity-50`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
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
