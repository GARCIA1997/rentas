import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listTemplates = async () => {
  return prisma.contractTemplate.findMany({
    select: { id: true, name: true, isDefault: true },
    orderBy: { name: 'asc' },
  });
};
