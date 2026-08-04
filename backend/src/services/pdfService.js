import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  resolveJurisdiction,
  resolveTenancyLaw,
  buildLegalBasisText,
  buildJurisdictionText,
} from '../db/legalFramework.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Brand icon embedded as a data URI so it renders in the generated PDF
// without needing network access from within the headless browser.
let cachedIconDataUri;
const getIconDataUri = () => {
  if (!cachedIconDataUri) {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const base64 = fs.readFileSync(iconPath).toString('base64');
    cachedIconDataUri = `data:image/png;base64,${base64}`;
  }
  return cachedIconDataUri;
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount));

export const formatDate = (date) =>
  new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

export const renderTemplate = (templateContent, variables) => {
  return templateContent.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
    variables[key] !== undefined ? String(variables[key]) : ''
  );
};

export const buildContractVariables = (contract) => {
  const penalty = contract.penaltyRules || {};
  const depositPolicy = contract.depositReturnPolicy || {};
  const utilities = contract.utilities || {};
  const inventory = contract.inventory || [];
  const witness = contract.witnessInfo || {};
  const landlord = contract.landlordsInfo || {};

  // El arrendamiento es materia local: la entidad se deriva de la ciudad del inmueble
  // y determina el código civil aplicable y el fuero al que se someten las partes.
  const jurisdiction = resolveJurisdiction(contract.property.city);
  // Ley inquilinaria especial (sólo vivienda, sólo donde exista). Sus disposiciones son de
  // orden público: el clausulado debe reflejarlas, no contradecirlas.
  const tenancyLaw = resolveTenancyLaw(jurisdiction, contract.property.propertyType);

  // Término definido con el que cada plantilla nombra la cosa arrendada. Los textos que se
  // arman aquí lo reutilizan para no decir "EL INMUEBLE" dentro de un contrato de local.
  const subject = contract.property.propertyType === 'LOCAL' ? 'EL LOCAL' : 'EL INMUEBLE';

  // Build inventory text
  const inventoryText = inventory.length > 0
    ? `${subject} incluye: ${inventory.map((item) => item.name).join(', ')}.`
    : '';

  // Build utilities text
  const utilitiesText =
    utilities.water || utilities.electricity || utilities.gas
      ? `${utilities.water ? 'El servicio de agua será pagado al arrendador. ' : ''}${
          utilities.electricity ? 'Luz y otros servicios corren por cuenta del Arrendatario. ' : ''
        }${utilities.gas ? 'Gas por cuenta del Arrendatario.' : ''}`
      : 'Los servicios de energía eléctrica, gas y demás consumos serán cubiertos por EL ARRENDATARIO, quien deberá acreditar su pago al término del contrato. El servicio de agua corre por cuenta de EL ARRENDADOR.';

  // Build convivance rules (default if not provided)
  const convivanceRulesText = contract.convivanceRules
    ? `<p class="clause">${contract.convivanceRules}</p>`
    : `<p class="clause">
        EL ARRENDATARIO se obliga a mantener una convivencia respetuosa con los demás ocupantes y vecinos,
        absteniéndose de generar ruidos que excedan un nivel moderado, en especial durante el horario de
        descanso comprendido entre las 22:00 y las 07:00 horas. Responderá por los actos de las personas que
        ocupen ${subject} o a quienes admita en él. La reiteración de conductas que perturben la tranquilidad
        de terceros, acreditada mediante queja fundada, se considerará incumplimiento para efectos de la
        cláusula de rescisión.
      </p>`;

  // Build witness section
  const witnessSection = witness.name
    ? `<div class="witness-block">
        <h3>Testigo</h3>
        <p class="clause">
          Comparece como testigo de la celebración y firma del presente contrato, haciendo constar que las
          partes lo suscribieron libremente y en su presencia:
        </p>
        <p class="clause">
          <strong>Nombre:</strong> ${witness.name} &nbsp;·&nbsp; <strong>Teléfono:</strong> ${witness.phone || 'N/A'}
        </p>
        <div style="margin-top: 34px; width: 45%; text-align: center;">
          <div style="border-top: 1px solid #0f172a; padding-top: 5px; font-size: 11px;">
            ${witness.name}<br>Testigo
          </div>
        </div>
      </div>`
    : '';

  return {
    logo_src: getIconDataUri(),
    landlord_name: landlord.name || contract.representative?.fullName || 'No asignado',
    landlord_phone: landlord.phone || contract.representative?.phone || 'N/A',
    representative_name: contract.representative?.fullName || 'No asignado',
    representative_position: contract.representative?.position || '',
    // Fragmento que se intercala en el proemio, entre el nombre y la coma que ya trae la
    // plantilla: "<nombre>, en su carácter de Administrador, a quien...". Sin él, queda
    // "<nombre>, a quien...", que también es gramatical.
    representative_position_text: contract.representative?.position
      ? `, en su carácter de ${contract.representative.position}`
      : '',
    representative_id_document: contract.representative?.idDocument || '',
    tenant_name: contract.tenant.fullName,
    tenant_id_document: contract.tenant.idDocument || 'N/A',
    property_type: contract.property.propertyType === 'HOUSE' ? 'casa habitación' : 'local comercial',
    property_name: contract.property.name,
    property_address: contract.property.address,
    property_city: contract.property.city,
    property_postal_code: contract.property.postalCode,
    start_date: formatDate(contract.startDate),
    end_date: formatDate(contract.endDate),
    duration_months: contract.durationMonths.toString(),
    payment_day: contract.paymentDay?.toString() ?? '5',
    monthly_rent: formatCurrency(contract.monthlyRent),
    deposit_amount: formatCurrency(contract.depositAmount),
    property_condition: 'buenas condiciones de habitabilidad y funcionamiento',
    additional_conditions: inventoryText,
    inventory_text: inventoryText,
    utilities_text: utilitiesText,
    water_included_text: contract.waterIncluded
      ? 'El servicio de agua se encuentra comprendido en la renta mensual pactada.'
      : 'El servicio de agua corre por cuenta de EL ARRENDATARIO, en adición e independientemente de la renta pactada.',
    convivance_rules: convivanceRulesText,
    additional_prohibitions: '',
    parking_text:
      'El área de estacionamiento, en su caso, se otorga en uso a título gratuito y accesorio al arrendamiento. EL ARRENDADOR no asume el carácter de depositario ni se hace responsable por daños, robos, pérdidas o afectaciones a vehículos, sus accesorios o los objetos que en ellos se dejen.',
    penalty_text: penalty.latePaymentPercentage
      ? `Las partes convienen, como pena convencional por el retraso en el pago de la renta, un recargo del ${penalty.latePaymentPercentage}% mensual sobre el monto adeudado, calculado por cada mes o fracción de retraso.${
          penalty.maxDamageCharge
            ? ` El cargo por daños ocasionados al inmueble se cuantificará conforme al costo real de reparación, hasta un máximo de ${formatCurrency(penalty.maxDamageCharge)}.`
            : ''
        }`
      : 'Las partes no pactan pena convencional adicional por mora, sin perjuicio del derecho de EL ARRENDADOR de exigir el pago de la renta vencida, los daños y perjuicios causados y la rescisión del contrato en términos de la cláusula respectiva.',
    deposit_return_text:
      depositPolicy.description ||
      `El depósito será devuelto a EL ARRENDATARIO dentro de los 30 días naturales siguientes a la entrega de ${subject}, previa verificación de su estado y de que se encuentre al corriente en el pago de servicios, descontándose en su caso el costo de las reparaciones por daños imputables a EL ARRENDATARIO, los adeudos pendientes y las penas convencionales devengadas, debiendo EL ARRENDADOR entregar el desglose correspondiente.`,
    auto_renewal_text: contract.autoRenewal
      ? 'Concluida la vigencia, el contrato se prorrogará automáticamente por periodos iguales en las mismas condiciones, salvo que cualquiera de las partes notifique a la otra por escrito su voluntad de no prorrogarlo, con al menos 30 días naturales de anticipación al vencimiento.'
      : 'Este contrato no se prorroga de forma automática; para continuar la relación arrendaticia deberá celebrarse un nuevo contrato por escrito, de mutuo acuerdo entre las partes.',
    signature_date: formatDate(new Date()),
    witness_section: witnessSection,
    jurisdiction_text: buildJurisdictionText(jurisdiction, contract.property.propertyType),
    legal_basis_text: buildLegalBasisText(jurisdiction, contract.property.propertyType),

    // Bajo la Ley Inquilinaria de Michoacán (art. 14) el plazo es forzoso sólo para el
    // arrendador; pactarlo forzoso para ambos sería renunciar a un beneficio irrenunciable.
    term_binding_text: tenancyLaw?.tenantMayTerminate
      ? `El presente contrato tendrá una vigencia de ${contract.durationMonths} meses, forzosa para EL ARRENDADOR y potestativa para EL ARRENDATARIO, quien podrá darlo por terminado anticipadamente dando aviso a EL ARRENDADOR con ${tenancyLaw.tenantNoticeMonths} meses de anticipación, en los términos de la ${tenancyLaw.name}`
      : `El presente contrato tendrá una vigencia forzosa para ambas partes de ${contract.durationMonths} meses`,

    // Art. 10 de la Ley Inquilinaria: el arrendador debe expedir recibo y el último hace
    // presumir el pago de las rentas anteriores.
    receipt_text: tenancyLaw
      ? 'EL ARRENDADOR está obligado a expedir a EL ARRENDATARIO el recibo correspondiente por cada pago; el último recibo hace presumir el pago de las rentas anteriores.'
      : 'Todo pago se acreditará mediante el recibo correspondiente que EL ARRENDADOR está obligado a expedir.',

    // Beneficios irrenunciables que conviene hacer constar en el propio contrato.
    tenancy_law_text: tenancyLaw
      ? `<p class="clause"><span class="clause-number">Derechos irrenunciables.</span> Las partes reconocen
         que a este contrato le resulta aplicable la ${tenancyLaw.name}, cuyas disposiciones son de orden
         público y sus beneficios irrenunciables. En particular: el depósito en garantía no podrá exceder de
         ${tenancyLaw.maxDepositMonths} mes de renta (art. 15); no se exige fiador (art. 16);
         ${tenancyLaw.rentIncreaseCapNote} (art. 4); EL ARRENDATARIO tiene derecho de preferencia para el
         nuevo arrendamiento si está al corriente (art. 8) y derecho al tanto si EL ARRENDADOR vende el
         inmueble (art. 17); y en caso de fallecimiento de EL ARRENDATARIO se subrogarán en sus derechos
         quienes hayan habitado el inmueble en los términos del art. 7. EL ARRENDADOR se obliga a presentar
         este contrato para su registro ante la Oficina Rentística dentro de los
         ${tenancyLaw.registrationDeadlineDays} días siguientes a su firma (arts. 3 y 26).</p>`
      : '',
  };
};

const receiptStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
    padding: 8px;
  }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 36px; height: 36px; border-radius: 9px; display: block; }
  .brand-name { font-size: 15px; font-weight: 700; color: #0d9488; }
  .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
  .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
  .status-badge {
    display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46;
  }
  .card { background: #f8fafc; border-radius: 14px; padding: 4px 18px; margin-bottom: 18px; }
  .row { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #e2e8f0; }
  .row:last-child { border-bottom: none; }
  .row .label { color: #64748b; }
  .row .value { font-weight: 600; text-align: right; }
  .total-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #0d9488; color: #ffffff; border-radius: 14px; padding: 16px 18px; margin-bottom: 18px;
  }
  .total-row .label { font-size: 13px; opacity: 0.9; }
  .total-row .value { font-size: 22px; font-weight: 700; }
  .late-fee {
    background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
    padding: 12px 16px; border-radius: 12px; margin-bottom: 18px; font-size: 12px; line-height: 1.5;
  }
  .footer-note { margin-top: 30px; font-size: 10.5px; color: #94a3b8; text-align: center; }
`;

export const buildReceiptHtml = (payment) => {
  const isLate = payment.paidDate && new Date(payment.paidDate) > new Date(payment.dueDate);
  const latePercentage = payment.contract?.penaltyRules?.latePaymentPercentage;
  const lateFeeAmount = isLate && latePercentage ? (Number(payment.amountDue) * latePercentage) / 100 : null;

  const methodLabels = {
    MANUAL: 'Manual',
    TRANSFERENCIA: 'Transferencia',
    EFECTIVO: 'Efectivo',
    CHEQUE: 'Cheque',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>${receiptStyles}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">
        <img src="${getIconDataUri()}" alt="KsaRed" />
        <span class="brand-name">KsaRed</span>
      </div>
      <p class="title" style="margin-top: 14px;">Recibo de Pago</p>
      <span class="status-badge">Pagado</span>
    </div>
    <div class="meta">
      Folio ${payment.id.slice(-8).toUpperCase()}<br>
      Emitido el ${formatDate(new Date())}
    </div>
  </div>

  <div class="card">
    <div class="row"><span class="label">Inquilino</span><span class="value">${payment.tenant.fullName}</span></div>
    <div class="row"><span class="label">Propiedad</span><span class="value">${payment.property.name}</span></div>
    <div class="row"><span class="label">Dirección</span><span class="value">${payment.property.address}, ${payment.property.city}</span></div>
    <div class="row"><span class="label">Concepto</span><span class="value">Renta — ${formatDate(payment.dueDate)}</span></div>
    <div class="row"><span class="label">Vencimiento</span><span class="value">${formatDate(payment.dueDate)}</span></div>
    <div class="row"><span class="label">Fecha de pago</span><span class="value">${payment.paidDate ? formatDate(payment.paidDate) : 'Pendiente'}</span></div>
    <div class="row"><span class="label">Método de pago</span><span class="value">${methodLabels[payment.paymentMethod] ?? payment.paymentMethod}</span></div>
    ${payment.notes ? `<div class="row"><span class="label">Notas</span><span class="value">${payment.notes}</span></div>` : ''}
  </div>

  ${
    lateFeeAmount
      ? `<div class="late-fee">Este pago se realizó después de la fecha de vencimiento. Conforme al contrato, aplica un recargo del ${latePercentage}% (${formatCurrency(lateFeeAmount)}) sobre el monto adeudado.</div>`
      : ''
  }

  <div class="total-row">
    <span class="label">Total pagado</span>
    <span class="value">${formatCurrency(payment.amountPaid)}</span>
  </div>

  <p class="footer-note">Documento generado automáticamente por KsaRed · Sistema de gestión de rentas</p>
</body>
</html>`;
};

let browserInstance;

const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
};

export const generatePdfBuffer = async (html) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    });
  } finally {
    await page.close();
  }
};
