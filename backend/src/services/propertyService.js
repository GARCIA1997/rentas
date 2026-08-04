import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listProperties = async () => {
  return prisma.property.findMany({
    include: {
      contracts: {
        where: { status: 'ACTIVE' },
        include: { tenant: { select: { id: true, fullName: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getProperty = async (id) => {
  const property = await prisma.property.findUnique({ where: { id } });

  if (!property) {
    throw { status: 404, message: 'Property not found' };
  }

  return property;
};

// Full profile view: current active contract (with tenant) plus contract
// history, for the property detail page.
export const getPropertyDetail = async (id) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      contracts: {
        include: { tenant: { select: { id: true, fullName: true, phone: true } } },
        orderBy: { startDate: 'desc' },
      },
    },
  });

  if (!property) {
    throw { status: 404, message: 'Property not found' };
  }

  const activeContract = property.contracts.find((c) => c.status === 'ACTIVE') ?? null;

  return { ...property, activeContract };
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
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
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
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      maintenanceNotes: data.maintenanceNotes,
    },
  });
};

export const deleteProperty = async (id) => {
  await getProperty(id);
  await prisma.property.delete({ where: { id } });
};
