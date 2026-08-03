import { PrismaClient } from '@prisma/client';
import path from 'path';
import { buildReceiptHtml, generatePdfBuffer } from './pdfService.js';

const prisma = new PrismaClient();
const CONTRACTS_DIR = path.join(process.cwd(), 'uploads', 'contracts');

export const getMyTenant = async (userId) => {
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    include: {
      property: { select: { id: true, name: true, address: true, city: true, propertyType: true } },
    },
  });

  if (!tenant) {
    throw { status: 404, message: 'No tenant profile linked to this account yet' };
  }

  return tenant;
};

export const getMyContracts = async (userId) => {
  const tenant = await getMyTenant(userId);
  return prisma.contract.findMany({
    where: { tenantId: tenant.id },
    include: {
      property: { select: { id: true, name: true, address: true, city: true } },
      representative: { select: { id: true, fullName: true, position: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getMyPayments = async (userId) => {
  const tenant = await getMyTenant(userId);
  return prisma.rentPayment.findMany({
    where: { tenantId: tenant.id },
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'desc' },
  });
};

export const getMyContractPdfPath = async (userId, contractId) => {
  const tenant = await getMyTenant(userId);
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });

  if (!contract || contract.tenantId !== tenant.id) {
    throw { status: 404, message: 'Contract not found' };
  }
  if (!contract.documentUrl) {
    throw { status: 404, message: 'PDF not generated yet' };
  }

  return path.join(CONTRACTS_DIR, `${contract.id}.pdf`);
};

export const getMyReceiptPdf = async (userId, paymentId) => {
  const tenant = await getMyTenant(userId);
  const payment = await prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      tenant: { select: { id: true, fullName: true, idDocument: true } },
      property: { select: { id: true, name: true, address: true, city: true } },
      contract: { select: { id: true, penaltyRules: true } },
    },
  });

  if (!payment || payment.tenantId !== tenant.id) {
    throw { status: 404, message: 'Payment not found' };
  }
  if (payment.status !== 'PAID') {
    throw { status: 400, message: 'Receipt only available for paid payments' };
  }

  const html = buildReceiptHtml(payment);
  return generatePdfBuffer(html);
};
