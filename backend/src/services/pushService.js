import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sin las tres variables configuradas, Web Push queda deshabilitado en silencio en vez
// de tronar en cada notificación — así un entorno sin VAPID (p. ej. CI, o un desarrollador
// que no las generó todavía) sigue funcionando con sólo las notificaciones in-app.
const vapidConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
);

if (vapidConfigured) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
} else {
  console.warn('⚠️  VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT no configuradas — Web Push deshabilitado.');
}

export const getPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export const saveSubscription = async (userId, subscription) => {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw { status: 400, message: 'Invalid push subscription' };
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    // Un mismo endpoint no puede pertenecer a dos usuarios a la vez — si el navegador ya
    // tenía una suscripción (de otra cuenta en el mismo dispositivo), se reasigna.
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
};

export const removeSubscription = async (endpoint) => {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
};

// Envía a TODAS las suscripciones del usuario (puede tener varios dispositivos). Una
// suscripción que el navegador ya invalidó devuelve 404/410 — se borra en silencio en
// vez de reintentar, es la señal estándar de "esta suscripción ya no existe".
export const sendPushToUser = async (userId, { title, body, url }) => {
  if (!vapidConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        } else {
          console.error(`Error enviando push a suscripción ${sub.id}:`, error.message);
        }
      }
    })
  );
};

export const sendPushToUsers = async (userIds, payload) => {
  await Promise.all(userIds.map((userId) => sendPushToUser(userId, payload)));
};
