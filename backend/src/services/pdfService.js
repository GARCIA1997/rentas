import puppeteer from 'puppeteer';

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
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 12px; line-height: 1.6; color: #111827; padding: 10px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #0d9488; margin: 0; }
  .header .receipt-id { text-align: right; font-size: 11px; color: #6b7280; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  .row .label { color: #6b7280; }
  .row .value { font-weight: bold; text-align: right; }
  .total { display: flex; justify-content: space-between; padding: 14px 0; margin-top: 10px; border-top: 2px solid #111827; font-size: 15px; }
  .late-fee { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 6px; margin: 16px 0; font-size: 11px; }
  .footer-note { margin-top: 50px; font-size: 10px; color: #6b7280; text-align: center; }
  .signature-line { border-top: 1px solid #111827; margin-top: 60px; padding-top: 6px; width: 260px; text-align: center; }
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
    <h1>Recibo de Pago</h1>
    <div class="receipt-id">
      Folio: ${payment.id.slice(-8).toUpperCase()}<br>
      Fecha de emisión: ${formatDate(new Date())}
    </div>
  </div>

  <div class="row"><span class="label">Inquilino</span><span class="value">${payment.tenant.fullName}</span></div>
  <div class="row"><span class="label">Propiedad</span><span class="value">${payment.property.name}</span></div>
  <div class="row"><span class="label">Dirección</span><span class="value">${payment.property.address}, ${payment.property.city}</span></div>
  <div class="row"><span class="label">Concepto</span><span class="value">Renta correspondiente al ${formatDate(payment.dueDate)}</span></div>
  <div class="row"><span class="label">Fecha de vencimiento</span><span class="value">${formatDate(payment.dueDate)}</span></div>
  <div class="row"><span class="label">Fecha de pago</span><span class="value">${payment.paidDate ? formatDate(payment.paidDate) : 'Pendiente'}</span></div>
  <div class="row"><span class="label">Método de pago</span><span class="value">${methodLabels[payment.paymentMethod] ?? payment.paymentMethod}</span></div>
  <div class="row"><span class="label">Monto adeudado</span><span class="value">${formatCurrency(payment.amountDue)}</span></div>

  ${
    lateFeeAmount
      ? `<div class="late-fee">Este pago se realizó después de la fecha de vencimiento. Conforme al contrato, aplica un recargo del ${latePercentage}% (${formatCurrency(lateFeeAmount)}) sobre el monto adeudado.</div>`
      : ''
  }

  ${payment.notes ? `<div class="row"><span class="label">Notas</span><span class="value">${payment.notes}</span></div>` : ''}

  <div class="total"><span>Total pagado</span><span>${formatCurrency(payment.amountPaid)}</span></div>

  <div class="signature-line">Recibí conforme</div>

  <p class="footer-note">Documento generado por el sistema de gestión de rentas KsaRed.</p>
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
