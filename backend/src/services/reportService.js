import { PrismaClient } from '@prisma/client';
import { sendPushToUsers } from './pushService.js';

const prisma = new PrismaClient();

const STATUS_LABELS = {
  REPORTED: 'Reportado',
  IN_PROGRESS: 'En progreso',
  CLOSED: 'Cerrado',
};

// Rutas relativas al propio origen de la PWA — el service worker las abre/enfoca tal
// cual, sin necesitar el dominio completo (ver sw.js `notificationclick`).
const tenantReportUrl = (reportId) => `/profile/reports/${reportId}`;
const adminReportUrl = (tenantId, reportId) => `/tenants/${tenantId}/reports/${reportId}`;

// El modelo NotificationLog nació pensado para WhatsApp (whatsappMessage NOT NULL) y nunca
// se conectó a nada. Se reusa aquí como el texto de la notificación in-app — es el único
// campo de texto que trae, y agregar uno nuevo sólo para renombrar hubiera sido una
// migración sin beneficio real. Cada notificación in-app dispara además un push real
// (Web Push estándar, vía pushService) con la misma URL de destino, para que tocar la
// notificación del sistema operativo lleve directo a la conversación, no a un genérico.
const notify = async (userIds, notificationType, message, url) => {
  if (userIds.length === 0) return;
  await prisma.notificationLog.createMany({
    data: userIds.map((userId) => ({ userId, notificationType, whatsappMessage: message })),
  });
  await sendPushToUsers(userIds, { title: 'KsaRed', body: message, url });
};

const messageInclude = {
  sender: { select: { id: true, firstName: true, lastName: true, role: true } },
};

const reportDetailInclude = {
  tenant: { select: { id: true, fullName: true, phone: true, userId: true } },
  property: { select: { id: true, name: true } },
  messages: { include: messageInclude, orderBy: { createdAt: 'asc' } },
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
  await notify(
    admins.map((admin) => admin.id),
    'MAINTENANCE_REPORT',
    `${tenant.fullName} reportó una incidencia: ${report.description.slice(0, 140)}`,
    adminReportUrl(tenant.id, report.id)
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

// Detalle + hilo completo. `expectedTenantId`, cuando se pasa, exige que el reporte
// pertenezca a ese tenant — es el guard de "no puedes leer la conversación de otro
// inquilino" en la ruta de /me.
const getReportOr404 = async (id, { expectedTenantId } = {}) => {
  const report = await prisma.maintenanceReport.findUnique({ where: { id }, include: reportDetailInclude });
  if (!report) {
    throw { status: 404, message: 'Report not found' };
  }
  if (expectedTenantId && report.tenantId !== expectedTenantId) {
    throw { status: 404, message: 'Report not found' };
  }
  return report;
};

export const getMyReportDetail = async (userId, reportId) => {
  const tenant = await prisma.tenant.findFirst({ where: { userId } });
  if (!tenant) {
    throw { status: 404, message: 'No tenant profile linked to this account yet' };
  }
  return getReportOr404(reportId, { expectedTenantId: tenant.id });
};

export const getReportDetail = async (reportId) => getReportOr404(reportId);

export const listReports = async () => {
  return prisma.maintenanceReport.findMany({
    include: {
      tenant: { select: { id: true, fullName: true, phone: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Reportes de UN tenant específico — la vía principal para el admin (desde el perfil
// del inquilino), separada del listado global de /settings/reports.
export const getTenantReports = async (tenantId) => {
  return prisma.maintenanceReport.findMany({
    where: { tenantId },
    include: { property: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

const assertNotClosed = (report) => {
  if (report.status === 'CLOSED') {
    throw { status: 400, message: 'Este reporte está cerrado y ya no acepta mensajes nuevos' };
  }
};

// El inquilino agrega un mensaje a su propio reporte. Notifica a todos los admins —
// mismo fan-out que al crear el reporte, porque para ellos un mensaje nuevo del
// inquilino es tan accionable como el reporte original.
export const addTenantMessage = async (userId, reportId, body) => {
  if (!body || !body.trim()) {
    throw { status: 400, message: 'Message body is required' };
  }
  const tenant = await prisma.tenant.findFirst({ where: { userId } });
  if (!tenant) {
    throw { status: 404, message: 'No tenant profile linked to this account yet' };
  }
  const report = await getReportOr404(reportId, { expectedTenantId: tenant.id });
  assertNotClosed(report);

  const message = await prisma.reportMessage.create({
    data: { reportId, senderId: userId, body: body.trim() },
    include: messageInclude,
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  await notify(
    admins.map((admin) => admin.id),
    'MAINTENANCE_REPORT',
    `${tenant.fullName} respondió en su reporte: ${message.body.slice(0, 140)}`,
    adminReportUrl(tenant.id, reportId)
  );

  return message;
};

// El admin responde. Notifica al User vinculado al tenant, si tiene cuenta — un tenant
// dado de alta sin invitación aceptada aún no tiene a quién notificar in-app/push, pero
// el mensaje igual queda guardado para cuando la acepte.
export const addAdminMessage = async (reportId, senderId, body) => {
  if (!body || !body.trim()) {
    throw { status: 400, message: 'Message body is required' };
  }
  const report = await getReportOr404(reportId);
  assertNotClosed(report);

  const message = await prisma.reportMessage.create({
    data: { reportId, senderId, body: body.trim() },
    include: messageInclude,
  });

  if (report.tenant.userId) {
    await notify(
      [report.tenant.userId],
      'REPORT_STATUS_CHANGED',
      `El administrador respondió tu reporte: ${message.body.slice(0, 140)}`,
      tenantReportUrl(reportId)
    );
  }

  return message;
};

export const updateReportStatus = async (id, status) => {
  if (!Object.keys(STATUS_LABELS).includes(status)) {
    throw { status: 400, message: 'Invalid status' };
  }

  const report = await getReportOr404(id);

  const updated = await prisma.maintenanceReport.update({
    where: { id },
    data: {
      status,
      completedDate: status === 'CLOSED' ? new Date() : report.completedDate,
    },
  });

  if (report.tenant.userId && status !== report.status) {
    await notify(
      [report.tenant.userId],
      'REPORT_STATUS_CHANGED',
      `Tu reporte cambió de estatus a: ${STATUS_LABELS[status]}`,
      tenantReportUrl(id)
    );
  }

  return updated;
};
