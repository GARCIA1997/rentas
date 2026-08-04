import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listTemplates = async () => {
  return prisma.contractTemplate.findMany({
    // propertyType permite al wizard ofrecer sólo las plantillas que aplican al inmueble
    // elegido; null significa que la plantilla sirve para cualquier tipo.
    select: { id: true, name: true, isDefault: true, propertyType: true },
    orderBy: { name: 'asc' },
  });
};
