import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_LABELS = {
  REPORTED: 'Reportado',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
};

// El modelo NotificationLog nació pensado para WhatsApp (whatsappMessage NOT NULL) y nunca
// se conectó a nada. Se reusa aquí como el texto de la notificación in-app — es el único
// campo de texto que trae, y agregar uno nuevo sólo para renombrar hubiera sido una
// migración sin beneficio real.
const notifyUsers = async (userIds, notificationType, message) => {
  if (userIds.length === 0) return;
  await prisma.notificationLog.createMany({
    data: userIds.map((userId) => ({ userId, notificationType, whatsappMessage: message })),
  });
};

export const createReport = async (userId, { description }) => {
  if (!description || !description.trim()) {
    throw { status: 400, message: 'Description is required' };
  }

  // La propiedad se resuelve del contrato activo del inquilino — no se le pide elegirla,
  // ya vive implícita en su contrato (mismo patrón que getMyTenant en meService.js).
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    include: {
      contracts: {
        where: { status: 'ACTIVE' },
        select: { propertyId: true },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw { status: 404, message: 'No tenant profile linked to this account yet' };
  }

  const report = await prisma.maintenanceReport.create({
    data: {
      tenantId: tenant.id,
      propertyId: tenant.contracts[0]?.propertyId ?? null,
      description: description.trim(),
    },
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  await notifyUsers(
    admins.map((admin) => admin.id),
    'MAINTENANCE_REPORT',
    `${tenant.fullName} reportó una incidencia: ${report.description.slice(0, 140)}`
  );

  return report;
};

export const getMyReports = async (userId) => {
  const tenant = await prisma.tenant.findFirst({ where: { userId } });
  if (!tenant) return [];

  return prisma.maintenanceReport.findMany({
    where: { tenantId: tenant.id },
    include: { property: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const listReports = async () => {
  return prisma.maintenanceReport.findMany({
    include: {
      tenant: { select: { id: true, fullName: true, phone: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateReportStatus = async (id, status) => {
  if (!Object.keys(STATUS_LABELS).includes(status)) {
    throw { status: 400, message: 'Invalid status' };
  }

  const report = await prisma.maintenanceReport.findUnique({ where: { id }, include: { tenant: true } });
  if (!report) {
    throw { status: 404, message: 'Report not found' };
  }

  const updated = await prisma.maintenanceReport.update({
    where: { id },
    data: {
      status,
      completedDate: status === 'RESOLVED' ? new Date() : report.completedDate,
    },
  });

  if (report.tenant.userId && status !== report.status) {
    await notifyUsers([report.tenant.userId], 'REPORT_STATUS_CHANGED', `Tu reporte cambió de estatus a: ${STATUS_LABELS[status]}`);
  }

  return updated;
};
