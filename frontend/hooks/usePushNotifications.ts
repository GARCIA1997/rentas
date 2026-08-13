'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { meApi } from '@/lib/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// El navegador exige la applicationServerKey como Uint8Array, pero VAPID se distribuye
// en base64 URL-safe — conversión estándar, no hay atajo en la Push API para esto.
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // TS tipa applicationServerKey como BufferSource; el ArrayBuffer subyacente (no la
  // vista Uint8Array en sí) es lo que satisface esa firma en las libs de DOM recientes.
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer as BufferSource;
}

export function usePushNotifications() {
  const { token } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !token || !VAPID_PUBLIC_KEY) return;
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await meApi.subscribePush(subscription.toJSON(), token);
      setIsSubscribed(true);
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, token]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !token) return;
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await meApi.unsubscribePush(subscription.endpoint, token);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, token]);

  return { isSupported: isSupported && Boolean(VAPID_PUBLIC_KEY), permission, isSubscribed, isBusy, subscribe, unsubscribe };
}
