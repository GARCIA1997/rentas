import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

  return {
    logo_src: getIconDataUri(),
    representative_name: contract.representative?.fullName ?? 'No asignado',
    representative_position: contract.representative?.position ?? '',
    representative_id_document: contract.representative?.idDocument ?? '',
    tenant_name: contract.tenant.fullName,
    tenant_id_document: contract.tenant.idDocument || 'N/A',
    property_name: contract.property.name,
    property_address: contract.property.address,
    property_city: contract.property.city,
    property_postal_code: contract.property.postalCode,
    start_date: formatDate(contract.startDate),
    end_date: formatDate(contract.endDate),
    monthly_rent: formatCurrency(contract.monthlyRent),
    deposit_amount: formatCurrency(contract.depositAmount),
    water_included_text: contract.waterIncluded
      ? 'El servicio de agua está incluido en la renta mensual.'
      : 'El servicio de agua corre por cuenta del inquilino, independientemente de la renta pactada.',
    penalty_text: penalty.latePaymentPercentage
      ? `En caso de retraso en el pago de la renta, se aplicará una penalización del ${penalty.latePaymentPercentage}% mensual sobre el monto adeudado.${
          penalty.maxDamageCharge
            ? ` El cargo máximo por daños ocasionados a la propiedad será de ${formatCurrency(penalty.maxDamageCharge)}.`
            : ''
        }`
      : 'No se han establecido penalizaciones específicas adicionales para este contrato.',
    deposit_return_text:
      depositPolicy.description ||
      'El depósito en garantía será devuelto conforme al estado en que se encuentre el inmueble al finalizar el contrato, pudiendo ser reembolsado de forma completa, parcial o no reembolsado, a criterio del arrendador según los daños identificados.',
    auto_renewal_text: contract.autoRenewal
      ? 'Este contrato se renovará automáticamente por periodos iguales al término de su vigencia, salvo notificación por escrito en contrario de cualquiera de las partes con al menos 30 días de anticipación.'
      : 'Este contrato no se renueva de forma automática; al término de su vigencia deberá formalizarse un nuevo contrato de mutuo acuerdo entre las partes.',
    signature_date: formatDate(new Date()),
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
