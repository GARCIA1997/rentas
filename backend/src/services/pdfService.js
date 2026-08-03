import puppeteer from 'puppeteer';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount));

const formatDate = (date) =>
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
