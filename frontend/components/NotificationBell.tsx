'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { meApi, Notification } from '@/lib/api';
import { formatDate } from '@/lib/formatDate';
import { BellIcon } from './icons';

// Sondeo ligero en vez de websockets: el volumen de notificaciones de esta app
// (reportes + cambios de estatus) no justifica una conexión persistente.
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({ onDark = false }: { onDark?: boolean }) {
  const { token } = useAuth();
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

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notificaciones"
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${onDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
      >
        <BellIcon className={`w-5 h-5 ${onDark ? 'text-white' : 'text-[#586270]'}`} />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-30 w-80 max-w-[85vw] max-h-96 overflow-y-auto glass-chrome rounded-lg shadow-lg">
          <div className="px-4 py-3 border-b border-black/[0.06]">
            <p className="text-sm font-semibold text-[#173A5F]">Notificaciones</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-[#586270] text-sm text-center py-6 px-4">Sin notificaciones.</p>
          ) : (
            <div className="divide-y divide-black/5">
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-[#173A5F] text-sm">{n.whatsappMessage}</p>
                  <p className="text-[#586270] text-xs mt-1">{formatDate(n.sentAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
