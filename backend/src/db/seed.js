import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPasswordHash = await bcryptjs.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '5551234567' },
    update: {},
    create: {
      phone: '5551234567',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Principal',
      email: 'admin@rentas.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Admin user created: ${admin.phone} / admin123456`);

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
