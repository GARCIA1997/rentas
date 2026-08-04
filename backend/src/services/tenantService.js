import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tenants no longer carry a direct property FK — their current property (if
// any) is derived from their active contract, if they have one.
const activeContractInclude = {
  contracts: {
    where: { status: 'ACTIVE' },
    include: { property: { select: { id: true, name: true, city: true } } },
    orderBy: { startDate: 'desc' },
    take: 1,
  },
};

export const listTenants = async () => {
  return prisma.tenant.findMany({
    include: activeContractInclude,
    orderBy: { createdAt: 'desc' },
  });
};

export const getTenant = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: activeContractInclude,
  });

  if (!tenant) {
    throw { status: 404, message: 'Tenant not found' };
  }

  return tenant;
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
  const userId = await findMatchingUserId(data.phone);

  return prisma.tenant.create({
    data: {
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      status: data.status ?? 'ACTIVE',
      notes: data.notes,
    },
  });
};

export const updateTenant = async (id, data) => {
  const existing = await getTenant(id);

  const userId =
    data.phone && data.phone !== existing.phone ? await findMatchingUserId(data.phone) : undefined;

  return prisma.tenant.update({
    where: { id },
    data: {
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      status: data.status,
      notes: data.notes,
    },
  });
};

export const deleteTenant = async (id) => {
  await getTenant(id);
  await prisma.tenant.delete({ where: { id } });
};
