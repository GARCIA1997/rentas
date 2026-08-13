// Service worker mínimo, sólo para Web Push — esta app no necesita cache offline
// (siempre requiere red para datos reales), así que no hay estrategia de cache aquí.
//
// Ciclo de vida: 'push' llega mientras el navegador está cerrado o en segundo plano —
// es lo único que hace posible que una notificación aparezca sin que la pestaña esté
// abierta. 'notificationclick' es lo que permite que tocar la notificación del sistema
// operativo lleve directo a la conversación (payload.url), no a un genérico "abrir app".

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'KsaRed', body: event.data.text() };
  }

  const { title = 'KsaRed', body = '', url = '/' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Si ya hay una pestaña de la app abierta, se reusa y navega ahí — evita duplicar
      // ventanas cada vez que se toca una notificación.
      for (const client of clientsList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
