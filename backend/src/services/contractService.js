import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { renderTemplate, buildContractVariables, generatePdfBuffer } from './pdfService.js';
import { calculateSuggestedRent, isContractRenewalEligible } from '../utils/rentCalculation.js';
import { checkStatutoryCompliance } from '../db/legalFramework.js';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'contracts');

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const includeRelations = {
  tenant: { select: { id: true, fullName: true, idDocument: true, phone: true } },
  // propertyType alimenta el destino declarado y el plazo legal máximo del contrato (10 años
  // habitación / 15 comercio), y city determina la entidad y el código civil aplicable.
  property: {
    select: { id: true, name: true, address: true, city: true, postalCode: true, propertyType: true },
  },
  representative: { select: { id: true, fullName: true, position: true, idDocument: true } },
};

export const listContracts = async () => {
  return prisma.contract.findMany({ include: includeRelations, orderBy: { createdAt: 'desc' } });
};

// Adjunta las advertencias de cumplimiento legal (p. ej. depósito por encima del tope que
// fija la ley inquilinaria). Son informativas: no bloquean, pero el admin debe verlas antes
// de firmar, porque se trata de normas de orden público que no puede pactar en contra.
const withLegalWarnings = (contract) => ({
  ...contract,
  legalWarnings: checkStatutoryCompliance({
    city: contract.property?.city,
    propertyType: contract.property?.propertyType,
    monthlyRent: contract.monthlyRent,
    depositAmount: contract.depositAmount,
    durationMonths: contract.durationMonths,
  }),
});

export const getContract = async (id) => {
  const contract = await prisma.contract.findUnique({ where: { id }, include: includeRelations });
  if (!contract) {
    throw { status: 404, message: 'Contract not found' };
  }
  return withLegalWarnings(contract);
};

// Resuelve la plantilla de un contrato para un inmueble dado.
//
// Si se indicó una, se valida que exista y que aplique al tipo de inmueble: el clausulado
// de casa habitación declara un destino distinto al de local comercial, así que emparejarlos
// mal produce un contrato que dice algo falso. Si no se indicó ninguna, se elige la
// específica del tipo y, en su defecto, una agnóstica (propertyType null).
const resolveTemplateForProperty = async (templateId, property) => {
  if (templateId) {
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      throw { status: 400, message: 'Contract template not found' };
    }
    if (template.propertyType && template.propertyType !== property.propertyType) {
      throw {
        status: 400,
        message: `La plantilla "${template.name}" no aplica a este tipo de inmueble (${property.propertyType}).`,
      };
    }
    return template.id;
  }

  const fallback =
    (await prisma.contractTemplate.findFirst({ where: { propertyType: property.propertyType } })) ||
    (await prisma.contractTemplate.findFirst({ where: { propertyType: null } }));

  if (!fallback) {
    throw {
      status: 400,
      message: `No hay una plantilla de contrato disponible para inmuebles de tipo ${property.propertyType}.`,
    };
  }
  return fallback.id;
};

// Builds the full-term monthly payment schedule for a contract
// First payment is due on startDate, subsequent payments on paymentDay of each following month
// El pago de depósito no forma parte de este calendario: lo genera markAsSigned aparte,
// porque las renovaciones reutilizan el depósito del contrato anterior.
const buildPaymentSchedule = (contract) => {
  const start = new Date(contract.startDate);
  const now = new Date();

  return Array.from({ length: contract.durationMonths }, (_, i) => {
    let dueDate;

    if (i === 0) {
      // First payment is due on contract start date
      dueDate = new Date(start);
    } else {
      // Subsequent payments: i months after start, on the specified paymentDay
      dueDate = new Date(
        start.getUTCFullYear(),
        start.getUTCMonth() + i,
        Math.min(contract.paymentDay, 28) // cap at 28 to avoid month-end issues
      );
    }

    return {
      contractId: contract.id,
      tenantId: contract.tenantId,
      propertyId: contract.propertyId,
      paymentType: 'RENT',
      paymentNumber: i + 1, // 1-indexed: 1, 2, 3, ..., durationMonths
      totalPaymentsInContract: contract.durationMonths,
      amountDue: contract.monthlyRent,
      amountPaid: 0,
      dueDate,
      paymentMethod: 'MANUAL',
      status: dueDate < now ? 'OVERDUE' : 'PENDING',
    };
  });
};

export const createContract = async (data) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
  if (!tenant) {
    throw { status: 400, message: 'Tenant not found' };
  }

  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) {
    throw { status: 400, message: 'Property not found' };
  }

  if (data.representativeId) {
    const representative = await prisma.representative.findUnique({ where: { id: data.representativeId } });
    if (!representative) {
      throw { status: 400, message: 'Representative not found' };
    }
  }

  const templateUsed = await resolveTemplateForProperty(data.templateId, property);

  // Calculate endDate from startDate + durationMonths
  const startDate = new Date(data.startDate);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + data.durationMonths);

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        representativeId: data.representativeId || null,
        startDate,
        durationMonths: data.durationMonths,
        paymentDay: data.paymentDay,
        endDate, // calculated field for backward compatibility
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        waterIncluded: data.waterIncluded ?? false,
        autoRenewal: data.autoRenewal ?? false,
        penaltyRules: data.penaltyRules ?? null,
        depositReturnPolicy: data.depositReturnPolicy ?? null,
        templateUsed,
        status: 'DRAFT',
      },
      include: includeRelations,
    });

    // No se generan los pagos aquí; se generarán cuando el contrato sea firmado (markAsSigned)
    // Esto permite cambios antes de firmar sin inconsistencias

    return withLegalWarnings(contract);
  });
};

export const updateContract = async (id, data) => {
  const contract = await getContract(id);

  if (contract.signedAt) {
    throw { status: 400, message: 'Signed contracts cannot be edited. Cancel it to make changes.' };
  }

  const updateData = {
    representativeId: data.representativeId,
    monthlyRent: data.monthlyRent,
    depositAmount: data.depositAmount,
    waterIncluded: data.waterIncluded,
    autoRenewal: data.autoRenewal,
    penaltyRules: data.penaltyRules,
    depositReturnPolicy: data.depositReturnPolicy,
    templateUsed: data.templateId,
  };

  // If startDate or durationMonths change, recalculate endDate
  if (data.startDate || data.durationMonths) {
    const startDate = data.startDate ? new Date(data.startDate) : contract.startDate;
    const durationMonths = data.durationMonths ?? contract.durationMonths;
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + durationMonths);

    updateData.startDate = startDate;
    updateData.durationMonths = durationMonths;
    updateData.endDate = endDate;
  }

  // Payment day can also be updated
  if (data.paymentDay) {
    updateData.paymentDay = data.paymentDay;
  }

  return prisma.contract.update({
    where: { id },
    data: updateData,
    include: includeRelations,
  });
};

export const deleteContract = async (id) => {
  const contract = await getContract(id);

  if (contract.status === 'ACTIVE') {
    throw { status: 400, message: 'Active contracts cannot be deleted. Cancel it instead.' };
  }

  await prisma.contract.delete({ where: { id } });
};

// Cancelling ends the contract early: it stops billing (future PENDING/OVERDUE
// payments are voided — anything already PAID stays as history) and frees up
// the property. The reason and any penalty terms already on the contract are
// kept on the record for reference; this doesn't invent a new penalty amount,
// it just surfaces what the contract already says.
export const cancelContract = async (id, reason) => {
  const contract = await getContract(id);

  if (contract.status !== 'ACTIVE') {
    throw { status: 400, message: 'Only active contracts can be cancelled' };
  }

  return prisma.$transaction(async (tx) => {
    await tx.rentPayment.deleteMany({
      where: { contractId: id, status: { in: ['PENDING', 'OVERDUE'] } },
    });

    const cancelled = await tx.contract.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      include: includeRelations,
    });

    await tx.property.update({ where: { id: contract.propertyId }, data: { status: 'LIBRE' } });

    return cancelled;
  });
};

export const generateContractPdf = async (id) => {
  const contract = await getContract(id);

  if (!contract.templateUsed) {
    throw { status: 400, message: 'Contract has no template assigned' };
  }

  const template = await prisma.contractTemplate.findUnique({ where: { id: contract.templateUsed } });
  if (!template) {
    throw { status: 400, message: 'Template not found' };
  }

  const variables = buildContractVariables(contract);
  const html = renderTemplate(template.templateContent, variables);
  const pdfBuffer = await generatePdfBuffer(html);

  ensureUploadsDir();
  const fileName = `${contract.id}.pdf`;
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), pdfBuffer);

  return prisma.contract.update({
    where: { id },
    data: {
      documentUrl: `/uploads/contracts/${fileName}`,
    },
    include: includeRelations,
  });
};

export const getContractPdfPath = async (id) => {
  const contract = await getContract(id);
  if (!contract.documentUrl) {
    throw { status: 404, message: 'PDF not generated yet' };
  }
  return path.join(UPLOADS_DIR, `${contract.id}.pdf`);
};

export const markAsSigned = async (id, signedDigitallyPhone, includeDeposit = true) => {
  const contract = await getContract(id);

  if (contract.signedAt) {
    throw { status: 400, message: 'Contract is already signed' };
  }

  return prisma.$transaction(async (tx) => {
    // Generar el plan de pagos de renta
    const rentPayments = buildPaymentSchedule(contract);
    await tx.rentPayment.createMany({ data: rentPayments });

    // Generar pago de depósito si existe e includeDeposit es true
    if (includeDeposit && contract.depositAmount && Number(contract.depositAmount) > 0) {
      await tx.rentPayment.create({
        data: {
          contractId: contract.id,
          tenantId: contract.tenantId,
          propertyId: contract.propertyId,
          paymentType: 'DEPOSIT',
          amountDue: contract.depositAmount,
          amountPaid: 0,
          dueDate: new Date(contract.startDate),
          paymentMethod: 'MANUAL',
          status: 'PENDING',
        },
      });
    }

    // Marcar como firmado, cambiar status a ACTIVE, marcar propiedad como OCUPADA
    const signed = await tx.contract.update({
      where: { id },
      data: {
        signedAt: new Date(),
        signedDigitallyPhone: !!signedDigitallyPhone,
        status: 'ACTIVE',
      },
      include: includeRelations,
    });

    await tx.property.update({ where: { id: contract.propertyId }, data: { status: 'OCUPADA' } });

    return signed;
  });
};

// Get contracts that need renewal: ACTIVE and endDate within 2 months
export const getContractsNeedingRenewal = async () => {
  const now = new Date();
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setUTCMonth(twoMonthsFromNow.getUTCMonth() + 2);

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gt: now,
        lte: twoMonthsFromNow,
      },
    },
    include: {
      tenant: { select: { id: true, fullName: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  // Enrich with suggested rent and days until end
  return contracts.map((contract) => ({
    ...contract,
    suggestedMonthlyRent: calculateSuggestedRent(contract.monthlyRent),
    daysUntilEnd: Math.ceil((contract.endDate - now) / (1000 * 60 * 60 * 24)),
  }));
};

// Renew a contract: creates new contract with inherited data, skips deposit
// previousContractId must be ACTIVE and eligible for renewal
export const renewContract = async (previousContractId, data) => {
  const previousContract = await getContract(previousContractId);

  if (!isContractRenewalEligible(previousContract)) {
    throw {
      status: 400,
      message: 'Contract is not eligible for renewal. Must be ACTIVE and within 2 months of end date.',
    };
  }

  // Validate that required fields are present before renewal
  const missingFields = [];
  if (!previousContract.templateUsed) missingFields.push('templateUsed');
  if (!previousContract.paymentDay) missingFields.push('paymentDay');
  if (!previousContract.tenantId) missingFields.push('tenantId');
  if (!previousContract.propertyId) missingFields.push('propertyId');

  if (missingFields.length > 0) {
    throw {
      status: 400,
      message: `Cannot renew: previous contract is incomplete. Missing fields: ${missingFields.join(', ')}`,
    };
  }

  // La plantilla se hereda, pero se revalida: si el contrato anterior quedó mal emparejado
  // o el inmueble cambió de tipo, la renovación arrastraría un clausulado equivocado.
  const templateUsed = await resolveTemplateForProperty(
    previousContract.templateUsed,
    previousContract.property
  );

  const { monthlyRent, durationMonths, representativeId } = data;

  if (!monthlyRent || !durationMonths) {
    throw { status: 400, message: 'monthlyRent and durationMonths are required' };
  }

  // Calculate new start date: day after previous contract ends
  const newStartDate = new Date(previousContract.endDate);
  newStartDate.setUTCDate(newStartDate.getUTCDate() + 1);

  // Calculate new end date
  const newEndDate = new Date(newStartDate);
  newEndDate.setUTCMonth(newEndDate.getUTCMonth() + durationMonths);

  return prisma.$transaction(async (tx) => {
    // Create new contract with inherited data from previous contract
    const newContract = await tx.contract.create({
      data: {
        tenantId: previousContract.tenantId,
        propertyId: previousContract.propertyId,
        previousContractId: previousContractId,
        representativeId: representativeId || previousContract.representativeId,
        startDate: newStartDate,
        durationMonths,
        paymentDay: previousContract.paymentDay, // Inherit payment day
        endDate: newEndDate,
        monthlyRent,
        depositAmount: previousContract.depositAmount, // Inherit for reference, but won't charge
        waterIncluded: previousContract.waterIncluded,
        autoRenewal: previousContract.autoRenewal,
        penaltyRules: previousContract.penaltyRules,
        depositReturnPolicy: previousContract.depositReturnPolicy,
        terms: previousContract.terms,
        inventory: previousContract.inventory,
        utilities: previousContract.utilities,
        convivanceRules: previousContract.convivanceRules,
        witnessInfo: previousContract.witnessInfo,
        landlordsInfo: previousContract.landlordsInfo,
        templateUsed,
        status: 'DRAFT',
      },
      include: includeRelations,
    });

    return withLegalWarnings(newContract);
  });
};
