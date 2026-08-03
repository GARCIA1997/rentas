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
