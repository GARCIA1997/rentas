'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, ThemePreference } from '@/lib/themeContext';
import { useToast } from '@/components/ToastProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { apiCall, invitesApi, reportsApi } from '@/lib/api';
import { MainHeader } from '@/components/StitchHeader';

const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro', icon: 'light_mode' },
  { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
  { value: 'system', label: 'Sistema', icon: 'settings_suggest' },
];

// Switch de Stitch (settings.html): pista gris / verde con punto blanco.
function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-block w-11 h-6 rounded-full shrink-0 transition-colors duration-200 disabled:opacity-50 ${on ? 'bg-[#2D9E6B]' : 'bg-[#c3c6cf]'}`}
    >
      <span
        className={`absolute top-0.5 left-0 block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      ></span>
    </button>
  );
}

const card = 'bg-[#ffffff] border border-[#c3c6cf]/40 rounded-lg p-space-md shadow-sm';
const rowLink = 'py-3 flex items-center justify-between hover:bg-[#f7f3ea]/60 active:scale-[0.99] transition-all rounded px-1 -mx-1';

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg bg-[#173a5f]/10 flex items-center justify-center text-[#173a5f]">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <h3 className="font-sans text-label-lg font-bold text-[#173a5f]">{title}</h3>
    </div>
  );
}

function RowIcon({ icon }: { icon: string }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#f1eee5] flex items-center justify-center text-[#173a5f]">
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, token } = useAuth();
  const { preference, setPreference } = useTheme();
  const { showToast } = useToast();
  const push = usePushNotifications();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [adminInviteLink, setAdminInviteLink] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') return;
    reportsApi
      .list(token)
      .then((list) => setPendingReports(list.filter((r) => r.status !== 'CLOSED').length))
      .catch(() => setPendingReports(0));
  }, [token, user?.role]);

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
    } catch {
      setNotificationsEnabled(!enabled);
      showToast('Error al actualizar configuración', 'error');
    }
  };

  const handleTogglePush = async () => {
    if (push.permission === 'denied') {
      showToast('Bloqueaste las notificaciones en el navegador — actívalas desde su configuración del sitio.', 'error');
      return;
    }
    try {
      if (push.isSubscribed) {
        await push.unsubscribe();
        showToast('Notificaciones push desactivadas', 'success');
      } else {
        await push.subscribe();
        showToast('Notificaciones push activadas', 'success');
      }
    } catch {
      showToast('Error al configurar las notificaciones push', 'error');
    }
  };

  const handleCreateAdminInvite = async () => {
    if (!token) return;
    setIsCreatingInvite(true);
    try {
      const invite = await invitesApi.create({ role: 'ADMIN' }, token);
      setAdminInviteLink(invite.link);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al generar la invitación', 'error');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!adminInviteLink) return;
    await navigator.clipboard.writeText(adminInviteLink);
    showToast('Link copiado', 'success');
  };

  const isAdmin = user?.role === 'ADMIN';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'KS';

  // Markup portado de Stitch: design/stitch/settings.html ("Más y Configuración")
  return (
    <>
      <MainHeader />
      <main className="max-w-md sm:max-w-2xl mx-auto w-full px-space-md pt-4 pb-24 sm:pb-8 flex flex-col gap-4">
        <div className="pt-1 flex items-center justify-between">
          <div>
            <span className="font-sans text-label-md text-[#73777f] tracking-wider uppercase font-semibold">
              {isAdmin ? 'Panel Administrador' : 'Portal del inquilino'}
            </span>
            <h1 className="font-sans text-headline-sm font-bold text-[#173a5f]">Más y Configuración</h1>
          </div>
          <span className="px-2.5 py-1 bg-[#f1eee5] rounded-lg text-[#173a5f] font-sans text-label-md font-semibold border border-[#c3c6cf]/30 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#2D9E6B]"></span>
            Online
          </span>
        </div>

        {/* Cuenta */}
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-[#ece8df] bg-[#173A5F] flex items-center justify-center text-white font-bold text-headline-sm">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#2D9E6B] border-2 border-white rounded-full"></span>
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-sans text-headline-sm text-[#173a5f] font-bold leading-snug truncate">
                {user?.firstName} {user?.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-block px-2 py-0.5 rounded-lg text-label-sm font-sans font-semibold bg-[#2D9E6B]/15 text-[#2D9E6B]">
                  {isAdmin ? 'Administrador General' : 'Inquilino'}
                </span>
                <span className="font-sans text-body-sm text-[#73777f]">{user?.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Apariencia */}
        <div className={card}>
          <SectionTitle icon="palette" title="Apariencia" />
          <div className="grid grid-cols-3 gap-2 bg-[#f1eee5] p-1 rounded-lg">
            {themeOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreference(value)}
                className={
                  preference === value
                    ? 'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-[#173a5f] text-[#ffffff] font-sans text-label-md font-semibold shadow-sm transition-all'
                    : 'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[#43474e] hover:text-[#173a5f] font-sans text-label-md font-medium transition-colors'
                }
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notificaciones */}
        <div className={card}>
          <SectionTitle icon="notifications_active" title="Notificaciones" />
          <div className="divide-y divide-[#c3c6cf]/20">
            <div className="py-2.5 flex items-center justify-between">
              <div className="flex flex-col pr-2">
                <span className="font-sans text-label-md text-[#173a5f] font-semibold">Notificaciones in-app</span>
                <span className="font-sans text-body-sm text-[#73777f]">Bandeja interna de actividades y cobros</span>
              </div>
              <Switch on={notificationsEnabled} disabled={isLoading} onClick={() => handleNotificationsToggle(!notificationsEnabled)} />
            </div>
            {push.isSupported && (
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex flex-col pr-2">
                  <span className="font-sans text-label-md text-[#173a5f] font-semibold">Notificaciones push</span>
                  <span className="font-sans text-body-sm text-[#73777f]">
                    {push.permission === 'denied' ? 'Bloqueadas en el navegador' : 'Avisos aunque la app esté cerrada'}
                  </span>
                </div>
                <Switch on={push.isSubscribed} disabled={push.isBusy} onClick={handleTogglePush} />
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className={card}>
            <SectionTitle icon="monitoring" title="Gestión y Reportes" />
            <div className="divide-y divide-[#c3c6cf]/20">
              <Link href="/settings/representatives" className={rowLink}>
                <div className="flex items-center gap-3">
                  <RowIcon icon="badge" />
                  <span className="font-sans text-label-md font-semibold text-[#173a5f]">Representantes legales</span>
                </div>
                <span className="material-symbols-outlined text-[#73777f]">chevron_right</span>
              </Link>
              <Link href="/settings/reports" className={rowLink}>
                <div className="flex items-center gap-3">
                  <RowIcon icon="assignment_late" />
                  <span className="font-sans text-label-md font-semibold text-[#173a5f]">Reportes de inquilinos</span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingReports > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-label-sm font-sans font-semibold bg-[#D9822B]/15 text-[#D9822B]">
                      {pendingReports} {pendingReports === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-[#73777f]">chevron_right</span>
                </div>
              </Link>
              <Link href="/reports" className={rowLink}>
                <div className="flex items-center gap-3">
                  <RowIcon icon="query_stats" />
                  <span className="font-sans text-label-md font-semibold text-[#173a5f]">Reportes financieros (MXN)</span>
                </div>
                <span className="material-symbols-outlined text-[#73777f]">chevron_right</span>
              </Link>
              <div className="py-3">
                <button
                  type="button"
                  onClick={adminInviteLink ? handleCopyInviteLink : handleCreateAdminInvite}
                  disabled={isCreatingInvite}
                  className={`${rowLink} w-full disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3">
                    <RowIcon icon="person_add" />
                    <div className="text-left">
                      <span className="font-sans text-label-md font-semibold text-[#173a5f] block">Invitar administrador</span>
                      <span className="font-sans text-body-sm text-[#73777f]">
                        {isCreatingInvite ? 'Generando...' : adminInviteLink ? 'Toca para copiar el link' : 'Link de un solo uso, vence en 7 días'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#73777f]">{adminInviteLink ? 'content_copy' : 'chevron_right'}</span>
                </button>
                {adminInviteLink && (
                  <p className="mt-2 text-[11px] text-[#173a5f] bg-[#f1eee5] rounded-lg px-3 py-2 break-all">{adminInviteLink}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            onClick={logout}
            className="w-full h-12 bg-[#ffffff] border border-[#C0392B] text-[#C0392B] hover:bg-[#ffdad6]/20 active:scale-95 transition-all rounded-lg font-sans text-label-lg font-semibold flex items-center justify-center gap-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
          <p className="font-sans text-body-sm text-[#73777f] text-center">KsaRed · Gestión Inteligente de Propiedades</p>
        </div>
      </main>
    </>
  );
}
