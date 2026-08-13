import cron from 'node-cron';
import { sendPaymentReminders } from './services/paymentReminderService.js';

// Corre una vez al día, hora de México (fija — Michoacán y Colima abolieron el horario
// de verano). 9am es horario razonable para que un push no llegue de madrugada.
const PAYMENT_REMINDER_CRON = '0 9 * * *';

export const startScheduler = () => {
  cron.schedule(
    PAYMENT_REMINDER_CRON,
    async () => {
      try {
        const result = await sendPaymentReminders();
        console.log(`Recordatorios de pago enviados: ${result.upcomingSent} próximos, ${result.overdueSent} vencidos.`);
      } catch (err) {
        console.error('Error enviando recordatorios de pago:', err);
      }
    },
    { timezone: 'America/Mexico_City' }
  );
};
