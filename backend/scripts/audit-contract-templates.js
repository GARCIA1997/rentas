// Audita el emparejamiento entre contratos y plantillas, y opcionalmente lo corrige.
//
//   node scripts/audit-contract-templates.js         # sólo reporta
//   node scripts/audit-contract-templates.js --fix   # además corrige
//
// Detecta dos problemas:
//   1. Contratos sin plantilla asignada (bloquean la generación de PDF y la renovación).
//   2. Contratos cuya plantilla no corresponde al tipo de inmueble — p. ej. un local
//      comercial con el contrato de casa habitación, cuyo clausulado declara un destino
//      distinto al real.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const shouldFix = process.argv.includes('--fix');

// Una plantilla sirve a un inmueble si es agnóstica (propertyType null) o si coincide.
const templateFits = (template, propertyType) =>
  template.propertyType === null || template.propertyType === propertyType;

const main = async () => {
  const templates = await prisma.contractTemplate.findMany();
  if (templates.length === 0) {
    console.error('❌ No hay plantillas en la base. Ejecuta el seed primero.');
    process.exit(1);
  }

  // Preferimos la plantilla específica del tipo sobre la agnóstica.
  const pickTemplate = (propertyType) =>
    templates.find((t) => t.propertyType === propertyType) ||
    templates.find((t) => t.propertyType === null);

  const contracts = await prisma.contract.findMany({
    select: {
      id: true,
      templateUsed: true,
      status: true,
      tenant: { select: { fullName: true } },
      property: { select: { name: true, propertyType: true } },
    },
  });

  const problems = [];

  for (const contract of contracts) {
    const { propertyType } = contract.property;
    const current = contract.templateUsed ? templates.find((t) => t.id === contract.templateUsed) : null;

    let reason = null;
    if (!contract.templateUsed) reason = 'sin plantilla';
    else if (!current) reason = `plantilla inexistente (${contract.templateUsed})`;
    else if (!templateFits(current, propertyType)) {
      reason = `plantilla "${current.name}" no aplica a ${propertyType}`;
    }

    if (reason) {
      problems.push({ contract, reason, suggested: pickTemplate(propertyType) });
    }
  }

  if (problems.length === 0) {
    console.log(`✅ ${contracts.length} contratos revisados, todos con plantilla correcta.`);
    return;
  }

  console.log(`Se encontraron ${problems.length} de ${contracts.length} contratos con problemas:\n`);
  for (const { contract, reason, suggested } of problems) {
    console.log(`  · ${contract.tenant.fullName} @ ${contract.property.name} [${contract.status}]`);
    console.log(`      problema: ${reason}`);
    console.log(`      sugerido: ${suggested ? suggested.name : '— sin plantilla compatible —'}`);
  }

  if (!shouldFix) {
    console.log('\nEjecuta con --fix para aplicar las plantillas sugeridas.');
    return;
  }

  const applicable = problems.filter((p) => p.suggested);
  for (const { contract, suggested } of applicable) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { templateUsed: suggested.id },
    });
  }

  console.log(`\n✅ ${applicable.length} contratos corregidos.`);
  const skipped = problems.length - applicable.length;
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} sin plantilla compatible; crea una para ese tipo de inmueble.`);
  }
};

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
