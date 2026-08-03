import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listTenants = async () => {
  return prisma.tenant.findMany({
    include: {
      property: { select: { id: true, name: true, city: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getTenant = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, city: true } },
    },
  });

  if (!tenant) {
    throw { status: 404, message: 'Tenant not found' };
  }

  return tenant;
};

const ensurePropertyExists = async (propertyId) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw { status: 400, message: 'Property not found' };
  }
};

// Links a tenant record to a self-registered user account when their phone
// numbers match, so the tenant portal can find "their" data regardless of
// whether they registered before or after the admin created the tenant record.
const findMatchingUserId = async (phone) => {
  if (!phone) return null;
  const user = await prisma.user.findFirst({ where: { phone, role: 'INQUILINO' } });
  return user?.id ?? null;
};

export const createTenant = async (data) => {
  await ensurePropertyExists(data.propertyId);
  const userId = await findMatchingUserId(data.phone);

  return prisma.tenant.create({
    data: {
      propertyId: data.propertyId,
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      moveInDate: new Date(data.moveInDate),
      status: data.status ?? 'ACTIVE',
    },
  });
};

export const updateTenant = async (id, data) => {
  const existing = await getTenant(id);

  if (data.propertyId) {
    await ensurePropertyExists(data.propertyId);
  }

  const userId =
    data.phone && data.phone !== existing.phone ? await findMatchingUserId(data.phone) : undefined;

  return prisma.tenant.update({
    where: { id },
    data: {
      propertyId: data.propertyId,
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      moveInDate: data.moveInDate ? new Date(data.moveInDate) : undefined,
      status: data.status,
    },
  });
};

export const deleteTenant = async (id) => {
  await getTenant(id);
  await prisma.tenant.delete({ where: { id } });
};
