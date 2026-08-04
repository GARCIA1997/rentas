import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { CASA_TEMPLATE, LOCAL_TEMPLATE, COAHUAYANA_TEMPLATE, CONTRACT_VARIABLES } from './contractTemplates.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Remove old demo admin from earlier seed runs, if present
  await prisma.user.deleteMany({ where: { phone: '5551234567' } });

  const adminPasswordHash = await bcryptjs.hash('@AgA151097', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '3131128425' },
    update: {},
    create: {
      phone: '3131128425',
      passwordHash: adminPasswordHash,
      firstName: 'Alejandro',
      lastName: 'Garcia Alvarez',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Admin user created: ${admin.phone}`);

  const representative = await prisma.representative.upsert({
    where: { id: 'seed-representative-1' },
    update: {},
    create: {
      id: 'seed-representative-1',
      fullName: 'Alejandro Garcia Alvarez',
      position: 'Administrador',
      createdBy: admin.id,
      isActive: true,
    },
  });

  console.log(`✅ Representative created: ${representative.fullName}`);

  const property1Data = {
    ownerId: admin.id,
    name: 'Casa Los Pinos #12',
    address: 'Calle Los Pinos 12',
    city: 'Coahuayana de Hidalgo',
    postalCode: '60920',
    propertyType: 'HOUSE',
    status: 'LIBRE',
    rentalPrice: 8500,
    waterIncluded: false,
    bedrooms: 3,
    bathrooms: 2,
  };

  const property1 = await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: property1Data,
    create: { id: 'seed-property-1', ...property1Data },
  });

  const property2Data = {
    ownerId: admin.id,
    name: 'Local Centro #3',
    address: 'Av. Madero 100, Local 3',
    city: 'Villa de Álvarez, Colima',
    postalCode: '28979',
    propertyType: 'LOCAL',
    status: 'LIBRE',
    rentalPrice: 12000,
    waterIncluded: true,
    bedrooms: null,
    bathrooms: 1,
  };

  const property2 = await prisma.property.upsert({
    where: { id: 'seed-property-2' },
    update: property2Data,
    create: {
      id: 'seed-property-2',
      ...property2Data,
    },
  });

  console.log(`✅ Properties created: ${property1.name}, ${property2.name}`);

  const casaTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-casa' },
    update: { templateContent: CASA_TEMPLATE, variables: CONTRACT_VARIABLES },
    create: {
      id: 'seed-template-casa',
      name: 'Contrato Estándar - Casa Habitación',
      templateContent: CASA_TEMPLATE,
      variables: CONTRACT_VARIABLES,
      isDefault: true,
      createdBy: admin.id,
    },
  });

  const localTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-local' },
    update: { templateContent: LOCAL_TEMPLATE, variables: CONTRACT_VARIABLES },
    create: {
      id: 'seed-template-local',
      name: 'Contrato Estándar - Local Comercial',
      templateContent: LOCAL_TEMPLATE,
      variables: CONTRACT_VARIABLES,
      isDefault: false,
      createdBy: admin.id,
    },
  });

  const coahuayanaTemplate = await prisma.contractTemplate.upsert({
    where: { id: 'seed-template-coahuayana' },
    update: { templateContent: COAHUAYANA_TEMPLATE, variables: CONTRACT_VARIABLES },
    create: {
      id: 'seed-template-coahuayana',
      name: 'Contrato Detallado - Con Inventario y Convivencia',
      templateContent: COAHUAYANA_TEMPLATE,
      variables: CONTRACT_VARIABLES,
      isDefault: false,
      createdBy: admin.id,
    },
  });

  console.log(`✅ Contract templates created: ${casaTemplate.name}, ${localTemplate.name}`);

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
