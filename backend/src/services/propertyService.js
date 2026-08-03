import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listProperties = async () => {
  return prisma.property.findMany({
    include: {
      _count: { select: { tenants: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getProperty = async (id) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      tenants: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!property) {
    throw { status: 404, message: 'Property not found' };
  }

  return property;
};

export const createProperty = async (data, ownerId) => {
  return prisma.property.create({
    data: {
      ownerId,
      name: data.name,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      propertyType: data.propertyType,
      status: data.status ?? 'LIBRE',
      rentalPrice: data.rentalPrice,
      waterIncluded: data.waterIncluded ?? false,
      maintenanceNotes: data.maintenanceNotes,
    },
  });
};

export const updateProperty = async (id, data) => {
  await getProperty(id);

  return prisma.property.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      propertyType: data.propertyType,
      status: data.status,
      rentalPrice: data.rentalPrice,
      waterIncluded: data.waterIncluded,
      maintenanceNotes: data.maintenanceNotes,
    },
  });
};

export const deleteProperty = async (id) => {
  await getProperty(id);
  await prisma.property.delete({ where: { id } });
};
