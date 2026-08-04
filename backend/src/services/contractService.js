import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { renderTemplate, buildContractVariables, generatePdfBuffer } from './pdfService.js';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'contracts');

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const includeRelations = {
  tenant: { select: { id: true, fullName: true, idDocument: true, phone: true } },
  property: { select: { id: true, name: true, address: true, city: true, postalCode: true } },
  representative: { select: { id: true, fullName: true, position: true, idDocument: true } },
};

export const listContracts = async () => {
  return prisma.contract.findMany({ include: includeRelations, orderBy: { createdAt: 'desc' } });
};

export const getContract = async (id) => {
  const contract = await prisma.contract.findUnique({ where: { id }, include: includeRelations });
  if (!contract) {
    throw { status: 404, message: 'Contract not found' };
  }
  return contract;
};

// Add N months to a date, keeping the day-of-month (with adjustment for months with fewer days)
const addMonthsUTC = (date, months) => {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
};

// Builds the full-term monthly payment schedule for a contract
// Payments are due on `paymentDay` of each month for `durationMonths` months
const buildPaymentSchedule = (contract) => {
  const start = new Date(contract.startDate);
  const now = new Date();

  return Array.from({ length: contract.durationMonths }, (_, i) => {
    // Calculate due date: start month + i months, on the specified paymentDay
    const dueDate = new Date(
      start.getUTCFullYear(),
      start.getUTCMonth() + i,
      Math.min(contract.paymentDay, 28) // cap at 28 to avoid month-end issues
    );

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
        templateUsed: data.templateId || null,
        status: 'DRAFT',
      },
      include: includeRelations,
    });

    // No se generan los pagos aquí; se generarán cuando el contrato sea firmado (markAsSigned)
    // Esto permite cambios antes de firmar sin inconsistencias

    return contract;
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

export const markAsSigned = async (id, signedDigitallyPhone) => {
  const contract = await getContract(id);

  if (contract.signedAt) {
    throw { status: 400, message: 'Contract is already signed' };
  }

  return prisma.$transaction(async (tx) => {
    // Generar el plan de pagos de renta
    const rentPayments = buildPaymentSchedule(contract);
    await tx.rentPayment.createMany({ data: rentPayments });

    // Generar pago de depósito si existe
    if (contract.depositAmount && Number(contract.depositAmount) > 0) {
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
