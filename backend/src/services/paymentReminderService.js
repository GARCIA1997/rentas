import { PrismaClient } from '@prisma/client';
import { sendPushToUsers } from './pushService.js';

const prisma = new PrismaClient();

// Cuántos días antes del vencimiento se manda el aviso de "próximo a vencer".
const UPCOMING_WINDOW_DAYS = 3;

const formatMoney = (amount) => `$${Number(amount).toLocaleString('es-MX')}`;
const formatDate = (date) =>
  new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const notify = async (userId, message) => {
  await prisma.notificationLog.create({
    data: { userId, notificationType: 'PAYMENT_REMINDER', whatsappMessage: message },
  });
  await sendPushToUsers([userId], { title: 'KsaRed', body: message, url: '/dashboard' });
};

// Recordatorios de pago vía Web Push + notificación in-app. Se ejecuta una vez al día
// (ver scheduler.js). Cada pago recibe como máximo dos avisos en toda su vida: uno
// cuando falta poco para el vencimiento y otro si llega a vencerse sin pagarse — los
// campos `upcomingReminderSentAt`/`overdueReminderSentAt` en RentPayment son la marca
// de "ya se avisó" que evita reenviarlo en cada corrida.
//
// No se usa el campo `status` para decidir qué está vencido: sólo se recalcula al
// escribir el registro (crear/editar), así que un pago sin tocar puede seguir en
// PENDING mucho después de su fecha límite. Aquí se compara `dueDate` contra la fecha
// actual directamente, igual que `computeStatus` en rentPaymentService.js.
export const sendPaymentReminders = async () => {
  const now = new Date();
  const upcomingLimit = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const unpaidWithTenant = {
    paidDate: null,
    tenant: { userId: { not: null } },
  };

  const [upcoming, overdue] = await Promise.all([
    prisma.rentPayment.findMany({
      where: {
        ...unpaidWithTenant,
        upcomingReminderSentAt: null,
        dueDate: { gte: now, lte: upcomingLimit },
      },
      include: { tenant: { select: { userId: true } } },
    }),
    prisma.rentPayment.findMany({
      where: {
        ...unpaidWithTenant,
        overdueReminderSentAt: null,
        dueDate: { lt: now },
      },
      include: { tenant: { select: { userId: true } } },
    }),
  ]);

  for (const payment of upcoming) {
    await notify(
      payment.tenant.userId,
      `Recordatorio: tu pago de ${formatMoney(payment.amountDue)} vence el ${formatDate(payment.dueDate)}.`
    );
    await prisma.rentPayment.update({ where: { id: payment.id }, data: { upcomingReminderSentAt: now } });
  }

  for (const payment of overdue) {
    await notify(
      payment.tenant.userId,
      `Tu pago de ${formatMoney(payment.amountDue)} venció el ${formatDate(payment.dueDate)} y sigue pendiente.`
    );
    await prisma.rentPayment.update({ where: { id: payment.id }, data: { overdueReminderSentAt: now } });
  }

  return { upcomingSent: upcoming.length, overdueSent: overdue.length };
};
