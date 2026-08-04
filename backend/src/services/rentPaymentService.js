import { PrismaClient } from '@prisma/client';
import { buildReceiptHtml, generatePdfBuffer } from './pdfService.js';

const prisma = new PrismaClient();

const includeRelations = {
  tenant: { select: { id: true, fullName: true, phone: true } },
  property: { select: { id: true, name: true, address: true, city: true } },
  contract: { select: { id: true, penaltyRules: true } },
};

const computeStatus = (amountDue, amountPaid, dueDate, paidDate) => {
  if (paidDate && Number(amountPaid) >= Number(amountDue)) {
    return 'PAID';
  }
  if (new Date(dueDate) < new Date()) {
    return 'OVERDUE';
  }
  return 'PENDING';
};

export const listPayments = async () => {
  return prisma.rentPayment.findMany({ include: includeRelations, orderBy: { dueDate: 'desc' } });
};

export const getPayment = async (id) => {
  const payment = await prisma.rentPayment.findUnique({ where: { id }, include: includeRelations });
  if (!payment) {
    throw { status: 404, message: 'Payment not found' };
  }
  return payment;
};

export const createPayment = async (data) => {
  const contract = await prisma.contract.findUnique({ where: { id: data.contractId } });
  if (!contract) {
    throw { status: 400, message: 'Contract not found' };
  }

  const amountPaid = data.amountPaid ?? 0;
  const paidDate = data.paidDate ? new Date(data.paidDate) : null;

  return prisma.rentPayment.create({
    data: {
      contractId: data.contractId,
      tenantId: contract.tenantId,
      propertyId: contract.propertyId,
      amountDue: data.amountDue,
      amountPaid,
      dueDate: new Date(data.dueDate),
      paidDate,
      paymentMethod: data.paymentMethod ?? 'MANUAL',
      paymentType: data.paymentType ?? 'RENT',
      paymentNumber: data.paymentNumber,
      totalPaymentsInContract: data.totalPaymentsInContract,
      notes: data.notes,
      status: computeStatus(data.amountDue, amountPaid, data.dueDate, paidDate),
    },
    include: includeRelations,
  });
};

export const updatePayment = async (id, data) => {
  const existing = await getPayment(id);

  const amountDue = data.amountDue ?? existing.amountDue;
  const amountPaid = data.amountPaid ?? existing.amountPaid;
  const dueDate = data.dueDate ?? existing.dueDate;
  const paidDate = data.paidDate !== undefined ? (data.paidDate ? new Date(data.paidDate) : null) : existing.paidDate;

  return prisma.rentPayment.update({
    where: { id },
    data: {
      amountDue,
      amountPaid,
      dueDate: new Date(dueDate),
      paidDate,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType,
      notes: data.notes,
      status: computeStatus(amountDue, amountPaid, dueDate, paidDate),
    },
    include: includeRelations,
  });
};

export const deletePayment = async (id) => {
  await getPayment(id);
  await prisma.rentPayment.delete({ where: { id } });
};

export const markAsPaid = async (id, paymentMethod) => {
  const existing = await getPayment(id);
  const paidDate = new Date();

  return prisma.rentPayment.update({
    where: { id },
    data: {
      amountPaid: existing.amountDue,
      paidDate,
      paymentMethod: paymentMethod ?? existing.paymentMethod,
      status: 'PAID',
    },
    include: includeRelations,
  });
};

export const generateReceiptPdf = async (id) => {
  const payment = await getPayment(id);

  if (payment.status !== 'PAID') {
    throw { status: 400, message: 'Receipt can only be generated for paid payments' };
  }

  const html = buildReceiptHtml(payment);
  return generatePdfBuffer(html);
};

// Get overdue payments (dueDate in the past and status is OVERDUE)
export const getOverduePayments = async () => {
  const now = new Date();
  return prisma.rentPayment.findMany({
    where: {
      dueDate: { lt: now },
      status: 'OVERDUE'
    },
    include: includeRelations,
    orderBy: { dueDate: 'asc' }
  });
};

// Get payments due within N days (default: 7 days)
export const getUpcomingPayments = async (daysAhead = 7) => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return prisma.rentPayment.findMany({
    where: {
      AND: [
        { dueDate: { gte: now, lte: futureDate } },
        { status: { in: ['PENDING'] } }
      ]
    },
    include: includeRelations,
    orderBy: { dueDate: 'asc' }
  });
};
