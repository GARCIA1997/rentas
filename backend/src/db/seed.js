import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

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

  const property1 = await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: {},
    create: {
      id: 'seed-property-1',
      ownerId: admin.id,
      name: 'Casa Los Pinos #12',
      address: 'Calle Los Pinos 12',
      city: 'Morelia',
      postalCode: '58000',
      propertyType: 'HOUSE',
      status: 'OCUPADA',
      rentalPrice: 8500,
      waterIncluded: false,
    },
  });

  const property2 = await prisma.property.upsert({
    where: { id: 'seed-property-2' },
    update: {},
    create: {
      id: 'seed-property-2',
      ownerId: admin.id,
      name: 'Local Centro #3',
      address: 'Av. Madero 100, Local 3',
      city: 'Colima',
      postalCode: '28000',
      propertyType: 'LOCAL',
      status: 'LIBRE',
      rentalPrice: 12000,
      waterIncluded: true,
    },
  });

  console.log(`✅ Properties created: ${property1.name}, ${property2.name}`);

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
