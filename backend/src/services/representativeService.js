import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listRepresentatives = async () => {
  return prisma.representative.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const getRepresentative = async (id) => {
  const representative = await prisma.representative.findUnique({ where: { id } });

  if (!representative) {
    throw { status: 404, message: 'Representative not found' };
  }

  return representative;
};

export const createRepresentative = async (data, createdBy) => {
  return prisma.representative.create({
    data: {
      fullName: data.fullName,
      position: data.position,
      idDocument: data.idDocument,
      phone: data.phone,
      email: data.email,
      signatureImageUrl: data.signatureImageUrl,
      isActive: data.isActive ?? true,
      createdBy,
    },
  });
};

export const updateRepresentative = async (id, data) => {
  await getRepresentative(id);

  return prisma.representative.update({
    where: { id },
    data: {
      fullName: data.fullName,
      position: data.position,
      idDocument: data.idDocument,
      phone: data.phone,
      email: data.email,
      signatureImageUrl: data.signatureImageUrl,
      isActive: data.isActive,
    },
  });
};

export const deleteRepresentative = async (id) => {
  await getRepresentative(id);
  await prisma.representative.delete({ where: { id } });
};
