// Marco legal aplicable al arrendamiento según la entidad donde se ubica el inmueble.
//
// El arrendamiento es materia local en México: lo rige el Código Civil de cada estado y,
// en Michoacán, además una Ley Inquilinaria especial para vivienda. Aquí se resuelve la
// entidad a partir de `property.city` y se arma el fundamento, la jurisdicción y las
// restricciones de orden público que la app debe respetar.
//
// FUENTES (consultadas el 4 de agosto de 2026):
//   · Código Civil para el Estado de Colima — texto en
//     https://docs.mexico.justia.com/estatales/colima/codigo-civil-para-el-estado-de-colima.pdf
//     Arrendamiento a partir del art. 2288. Artículos verificados contra el texto:
//       2288 definición y plazos máximos · 2296 forma escrita · 2302 obligaciones del
//       arrendador · 2315 obligaciones del arrendatario · 2370 subarriendo y cesión ·
//       2379 causas de rescisión.
//   · Ley Inquilinaria del Estado de Michoacán (P.O. 24-dic-1984, ref. 30-sep-1986) —
//     http://www.ordenjuridico.gob.mx/Publicaciones/DI2005/pdf/MICH6.pdf
//     Artículos verificados contra el texto: 1 ámbito · 2 orden público e irrenunciable ·
//     3 forma y contenido · 4 tope al incremento de renta · 7 subrogación por muerte ·
//     8 preferencia · 10 recibos · 12 lugar y plazo de pago · 14 duración mínima ·
//     15 tope al depósito · 16 prohibición de fiador · 17 derecho al tanto ·
//     19-20 descripción del inmueble · 22 plazo de desocupación · 26 registro.
//     NOTA: existe una reforma posterior (P.O. 29-dic-2016) que actualizó el umbral de
//     forma escrita del art. 3 a UMA; no se pudo consultar su texto íntegro.
//   · Código Civil Federal, arts. 2398-2496, como referencia supletoria.
//
// PENDIENTE DE VERIFICAR: el articulado del Código Civil del Estado de Michoacán. No se
// localizó su texto oficial legible, así que se cita por nombre pero SIN número de
// artículo. No inventar números aquí: una cita falsa en un contrato real es peor que
// ninguna cita.

const MICHOACAN = {
  key: 'MICHOACAN',
  state: 'Michoacán de Ocampo',
  civilCode: 'Código Civil para el Estado de Michoacán de Ocampo',
  // Ley especial que desplaza al código civil en arrendamiento de vivienda.
  tenancyLaw: {
    name: 'Ley Inquilinaria del Estado de Michoacán',
    // Art. 1: rige el arrendamiento de edificios, casas, apartamentos y locales o
    // viviendas "que se arrienden sin más finalidad que la de ser habitados".
    appliesTo: 'HOUSE',
    // Art. 15: en ningún caso podrá exigirse más de un mes de depósito en garantía.
    maxDepositMonths: 1,
    // Art. 14: duración mínima de un año, forzosa para el arrendador y POTESTATIVA para
    // el arrendatario, que puede darlo por terminado avisando con dos meses.
    minTermMonths: 12,
    tenantMayTerminate: true,
    tenantNoticeMonths: 2,
    // Art. 4: la renta sólo puede incrementarse anualmente y el incremento no excederá
    // del 70% del porcentaje de aumento autorizado al salario mínimo general de la zona.
    rentIncreaseCapNote:
      'el incremento anual no puede exceder del 70% del porcentaje de aumento autorizado al salario mínimo general de la zona',
    // Arts. 3 y 26: registro ante la Oficina Rentística dentro de los 30 días siguientes
    // a la firma; el art. 3 lo exige "para su validez".
    requiresRegistration: true,
    registrationDeadlineDays: 30,
  },
  citations: {
    // Sin artículos del código civil estatal por lo dicho arriba.
    civil: null,
  },
};

const COLIMA = {
  key: 'COLIMA',
  state: 'Colima',
  civilCode: 'Código Civil para el Estado de Colima',
  tenancyLaw: null,
  citations: {
    civil: {
      definition: '2288',
      maxTerm: '2288',
      writtenForm: '2296',
      landlordDuties: '2302',
      tenantDuties: '2315',
      sublease: '2370',
      rescission: '2379',
      range: '2288 a 2390',
    },
  },
};

const DEFAULT_JURISDICTION = MICHOACAN;

// Mapea la ciudad registrada en la propiedad a su entidad federativa.
const CITY_MATCHERS = [
  { pattern: /coahuayana/i, jurisdiction: MICHOACAN },
  { pattern: /michoac/i, jurisdiction: MICHOACAN },
  { pattern: /villa de [aá]lvarez|colima|manzanillo|comala|tecom[aá]n/i, jurisdiction: COLIMA },
];

export const resolveJurisdiction = (city = '') => {
  const match = CITY_MATCHERS.find(({ pattern }) => pattern.test(city));
  return match ? match.jurisdiction : DEFAULT_JURISDICTION;
};

// ¿Aplica la ley inquilinaria especial a este inmueble? Sólo vivienda, y sólo donde exista.
export const resolveTenancyLaw = (jurisdiction, propertyType) => {
  const law = jurisdiction.tenancyLaw;
  return law && law.appliesTo === propertyType ? law : null;
};

// Plazo máximo legal del arrendamiento según el destino del inmueble: 10 años habitación,
// 15 comercio, 20 industria. Regla idéntica en el CCF (2398) y en Colima (2288).
export const maxLegalTermYears = (propertyType) => (propertyType === 'LOCAL' ? 15 : 10);

// Restricciones de orden público que la aplicación debe hacer cumplir antes de firmar.
// Devuelve una lista de incumplimientos legibles; vacía significa que el contrato es
// conforme en los puntos que sabemos verificar automáticamente.
export const checkStatutoryCompliance = ({ city, propertyType, monthlyRent, depositAmount, durationMonths }) => {
  const law = resolveTenancyLaw(resolveJurisdiction(city), propertyType);
  if (!law) return [];

  const issues = [];

  const depositMonths = Number(monthlyRent) > 0 ? Number(depositAmount) / Number(monthlyRent) : 0;
  if (depositMonths > law.maxDepositMonths) {
    issues.push(
      `El depósito equivale a ${depositMonths.toFixed(1)} meses de renta. La ${law.name} (art. 15) prohíbe exigir más de ${law.maxDepositMonths} mes de depósito en garantía para vivienda.`
    );
  }

  if (durationMonths < law.minTermMonths) {
    issues.push(
      `La duración de ${durationMonths} meses es menor al mínimo de ${law.minTermMonths} meses que fija la ${law.name} (art. 14) para arrendamiento de vivienda.`
    );
  }

  return issues;
};

export const buildLegalBasisText = (jurisdiction, propertyType) => {
  const destino = propertyType === 'LOCAL' ? 'al comercio' : 'a habitación';
  const maxYears = maxLegalTermYears(propertyType);
  const law = resolveTenancyLaw(jurisdiction, propertyType);
  const cites = jurisdiction.citations.civil;

  // Cuando conocemos el articulado estatal lo citamos; si no, sólo el código por nombre.
  const stateCite = cites
    ? `<strong>${jurisdiction.civilCode}</strong> (arts. ${cites.range}; en particular ${cites.definition} objeto y plazos, ${cites.landlordDuties} obligaciones del arrendador, ${cites.tenantDuties} obligaciones del arrendatario, ${cites.sublease} subarriendo y ${cites.rescission} causas de rescisión)`
    : `<strong>${jurisdiction.civilCode}</strong>`;

  const tenancyCite = law
    ? ` Por tratarse de un inmueble destinado a habitación, resulta aplicable de manera preferente la
       <strong>${law.name}</strong>, cuyas disposiciones son de orden público y sus beneficios
       irrenunciables (art. 2), en particular las relativas a duración mínima (art. 14), depósito en
       garantía (art. 15), incremento de la renta (art. 4), expedición de recibos (art. 10) y registro
       del contrato ante la Oficina Rentística (arts. 3 y 26).`
    : '';

  return `El presente contrato se rige por las disposiciones en materia de arrendamiento del ${stateCite},
    y supletoriamente por el <strong>Código Civil Federal</strong> (arts. 2398 a 2496) en lo no previsto.
    Se hace constar que el plazo pactado no excede el máximo legal de ${maxYears} años aplicable a las
    fincas destinadas ${destino}.${tenancyCite}`;
};

export const buildJurisdictionText = (jurisdiction, propertyType) => {
  const law = resolveTenancyLaw(jurisdiction, propertyType);
  const laws = law ? `la ${law.name} y el ${jurisdiction.civilCode}` : `el ${jurisdiction.civilCode}`;

  return `Para la interpretación, ejecución y cumplimiento del presente contrato, las partes se someten
   expresamente a lo dispuesto por ${laws} y a la competencia de los tribunales del fuero común del lugar
   de ubicación del bien arrendado, en el Estado de ${jurisdiction.state}. Las estipulaciones de este
   contrato que resulten contrarias a disposiciones de orden público se tendrán por no puestas,
   prevaleciendo la norma legal.`;
};
