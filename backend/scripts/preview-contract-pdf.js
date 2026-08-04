// Genera un PDF de vista previa por cada plantilla usando datos ficticios, para revisar
// el diseño y el texto legal sin tocar contratos reales.
//   docker exec rentas_backend node scripts/preview-contract-pdf.js
import fs from 'fs';
import path from 'path';
import { CASA_TEMPLATE, LOCAL_TEMPLATE, COAHUAYANA_TEMPLATE } from '../src/db/contractTemplates.js';
import { renderTemplate, buildContractVariables, generatePdfBuffer } from '../src/services/pdfService.js';

const OUT_DIR = path.join(process.cwd(), 'uploads', 'preview');

const sampleContract = (overrides = {}) => ({
  startDate: new Date('2026-09-01'),
  endDate: new Date('2027-09-01'),
  durationMonths: 12,
  paymentDay: 7,
  monthlyRent: 8500,
  depositAmount: 17000,
  waterIncluded: true,
  autoRenewal: false,
  penaltyRules: { latePaymentPercentage: 5, maxDamageCharge: 15000 },
  depositReturnPolicy: null,
  utilities: null,
  inventory: [{ name: 'refrigerador' }, { name: 'estufa' }, { name: 'boiler' }],
  witnessInfo: { name: 'María Elena Ruiz Vargas', phone: '3131234567' },
  landlordsInfo: null,
  convivanceRules: null,
  tenant: { fullName: 'Juan Carlos Ramírez Solís', idDocument: 'INE 1234567890' },
  representative: { fullName: 'Ana Robles Díaz', position: 'Administrador', phone: '5550000000' },
  property: {
    name: 'Casa Los Pinos #12',
    address: 'Calle Los Pinos 12',
    city: 'Coahuayana de Hidalgo',
    postalCode: '60920',
    propertyType: 'HOUSE',
  },
  ...overrides,
});

const cases = [
  { file: 'casa-michoacan.pdf', template: CASA_TEMPLATE, contract: sampleContract() },
  {
    file: 'local-colima.pdf',
    template: LOCAL_TEMPLATE,
    contract: sampleContract({
      monthlyRent: 12000,
      depositAmount: 24000,
      waterIncluded: false,
      property: {
        name: 'Local Centro #3',
        address: 'Av. Madero 100, Local 3',
        city: 'Villa de Álvarez, Colima',
        postalCode: '28979',
        propertyType: 'LOCAL',
      },
    }),
  },
  { file: 'enriquecido.pdf', template: COAHUAYANA_TEMPLATE, contract: sampleContract() },
];

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { file, template, contract } of cases) {
    const html = renderTemplate(template, buildContractVariables(contract));

    const leftovers = [...html.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]);
    if (leftovers.length > 0) {
      console.warn(`⚠️  ${file}: variables sin resolver -> ${[...new Set(leftovers)].join(', ')}`);
    }

    fs.writeFileSync(path.join(OUT_DIR, file), await generatePdfBuffer(html));
    console.log(`✅ ${path.join(OUT_DIR, file)}`);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
