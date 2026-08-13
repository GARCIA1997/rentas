-- AlterTable
ALTER TABLE "RentPayment" ADD COLUMN     "overdueReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "upcomingReminderSentAt" TIMESTAMP(3);

