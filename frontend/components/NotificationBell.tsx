'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { meApi, Notification } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import Link from 'next/link';

// Sondeo ligero en vez de websockets: el volumen de notificaciones de esta app
// (reportes + cambios de estatus) no justifica una conexión persistente.
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({ onDark = false }: { onDark?: boolean }) {
  const { token, user } = useAuth();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const poll = () => meApi.getUnreadNotificationCount(token).then((r) => setCount(r.count)).catch(() => {});
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    if (!token) return;
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      const list = await meApi.getNotifications(token);
      setNotifications(list);
      if (count > 0) {
        await meApi.markNotificationsAsRead(token);
        setCount(0);
      }
    }
  };

  const unread = notifications.filter((n) => !n.readAt).length;

  // Markup portado de Stitch: design/stitch/toasts.html ("Panel desplegable de notificaciones").
  // Fondo blanco sólido: la versión anterior usaba .glass-chrome, que ya no existe en
  // globals.css y dejaba el panel transparente sobre el contenido.
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notificaciones"
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${onDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        type="button"
      >
        <span className={`material-symbols-outlined text-[24px] ${onDark ? 'text-white' : 'text-[#173A5F]'}`}>notifications</span>
        {count > 0 && (
          <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#2D9E6B] rounded-full ring-2 ${onDark ? 'ring-[#173A5F]' : 'ring-white'}`} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[55] bg-[#173A5F]/30 sm:bg-transparent" onClick={() => setIsOpen(false)} />
          <section className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96 z-[60] bg-white rounded-lg border border-[#DDD9CF] shadow-xl overflow-hidden text-left">
            <div className="px-4 py-3 border-b border-[#EAE6DC] flex items-center justify-between bg-white">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[#173A5F] text-[20px]">notifications_active</span>
                <h2 className="text-sm font-bold text-[#173A5F]">Notificaciones</h2>
                {unread > 0 && (
                  <span className="bg-[#2D9E6B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unread} {unread === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Cerrar" type="button" className="text-[#73777f] hover:text-[#173A5F] p-0.5">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#EAE6DC]">
              {notifications.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#73777f]">notifications_off</span>
                  <p className="text-xs text-[#73777f] mt-1">Sin notificaciones por ahora.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_META[n.notificationType] ?? TYPE_META.MAINTENANCE_REPORT;
                  const href = notificationHref(n, user?.role);
                  const body = (
                    <>
                      {!n.readAt && <div className="absolute left-2 top-4 w-2 h-2 rounded-full bg-[#2D9E6B]"></div>}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ml-1 ${meta.box}`}>
                        <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[#173A5F] truncate">{meta.title}</p>
                          <span className="text-[10px] text-[#73777f] font-medium whitespace-nowrap">{timeAgo(n.sentAt)}</span>
                        </div>
                        <p className="text-[11px] text-[#475569] leading-snug mt-1">{n.whatsappMessage}</p>
                      </div>
                    </>
                  );
                  const cls = `p-3.5 flex items-start space-x-3 relative transition ${n.readAt ? 'bg-white' : 'bg-[#F5F1E8]/40'} ${href ? 'hover:bg-[#F5F1E8] cursor-pointer' : ''}`;
                  return href ? (
                    <Link key={n.id} href={href} onClick={() => setIsOpen(false)} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id} className={cls}>
                      {body}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const TYPE_META: Record<Notification['notificationType'], { icon: string; title: string; box: string }> = {
  MAINTENANCE_REPORT: { icon: 'build', title: 'Reporte de mantenimiento', box: 'bg-[#2D9E6B]/15 text-[#2D9E6B]' },
  REPORT_STATUS_CHANGED: { icon: 'sync_alt', title: 'Cambio de estatus', box: 'bg-[#173A5F]/10 text-[#173A5F]' },
  PAYMENT_REMINDER: { icon: 'receipt_long', title: 'Recordatorio de pago', box: 'bg-[#D9822B]/15 text-[#D9822B]' },
  PAYMENT_CONFIRMED: { icon: 'payments', title: 'Pago confirmado', box: 'bg-[#2D9E6B]/15 text-[#2D9E6B]' },
  CONTRACT_SIGNED: { icon: 'history_edu', title: 'Contrato firmado', box: 'bg-[#173A5F]/10 text-[#173A5F]' },
};

// NotificationLog no guarda URL; se infiere el destino por tipo y rol.
function notificationHref(n: Notification, role?: string): string | null {
  const admin = role === 'ADMIN';
  switch (n.notificationType) {
    case 'MAINTENANCE_REPORT':
    case 'REPORT_STATUS_CHANGED':
      return admin ? '/settings/reports' : '/profile?tab=reportes';
    case 'PAYMENT_REMINDER':
    case 'PAYMENT_CONFIRMED':
      return admin ? '/payments' : '/dashboard';
    case 'CONTRACT_SIGNED':
      return admin ? '/contracts' : '/profile';
    default:
      return null;
  }
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `Hace ${days} d` : formatDate(iso);
}
