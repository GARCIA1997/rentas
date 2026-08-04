import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStats = async () => {
  const [
    totalProperties,
    occupiedCount,
    freeCount,
    maintenanceCount,
    activeTenants,
    activeRepresentatives,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'OCUPADA' } }),
    prisma.property.count({ where: { status: 'LIBRE' } }),
    prisma.property.count({ where: { status: 'MANTENIMIENTO' } }),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.representative.count({ where: { isActive: true } }),
  ]);

  return {
    properties: {
      total: totalProperties,
      ocupada: occupiedCount,
      libre: freeCount,
      mantenimiento: maintenanceCount,
    },
    activeTenants,
    activeRepresentatives,
  };
};

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Monthly income for the last 6 months (including the current one), based on
// when payments were actually collected (paidDate), not when they were due.
export const getMonthlyIncome = async () => {
  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const payments = await prisma.rentPayment.findMany({
    where: { status: 'PAID', paidDate: { gte: rangeStart } },
    select: { amountPaid: true, paidDate: true },
  });

  const buckets = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const bucketDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${bucketDate.getUTCFullYear()}-${bucketDate.getUTCMonth()}`;
    buckets.set(key, {
      month: `${MONTH_LABELS[bucketDate.getUTCMonth()]} ${bucketDate.getUTCFullYear()}`,
      total: 0,
    });
  }

  for (const payment of payments) {
    const paidDate = new Date(payment.paidDate);
    const key = `${paidDate.getUTCFullYear()}-${paidDate.getUTCMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += Number(payment.amountPaid);
    }
  }

  return Array.from(buckets.values());
};
