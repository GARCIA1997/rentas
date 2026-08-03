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
  tenant: { select: { id: true, fullName: true, idDocument: true, propertyId: true } },
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

export const createContract = async (data) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
  if (!tenant) {
    throw { status: 400, message: 'Tenant not found' };
  }

  if (data.representativeId) {
    const representative = await prisma.representative.findUnique({ where: { id: data.representativeId } });
    if (!representative) {
      throw { status: 400, message: 'Representative not found' };
    }
  }

  return prisma.contract.create({
    data: {
      tenantId: data.tenantId,
      propertyId: tenant.propertyId,
      representativeId: data.representativeId || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
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
};

export const updateContract = async (id, data) => {
  await getContract(id);

  return prisma.contract.update({
    where: { id },
    data: {
      representativeId: data.representativeId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount,
      waterIncluded: data.waterIncluded,
      autoRenewal: data.autoRenewal,
      penaltyRules: data.penaltyRules,
      depositReturnPolicy: data.depositReturnPolicy,
      templateUsed: data.templateId,
    },
    include: includeRelations,
  });
};

export const deleteContract = async (id) => {
  await getContract(id);
  await prisma.contract.delete({ where: { id } });
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
      status: contract.status === 'DRAFT' ? 'ACTIVE' : contract.status,
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
  await getContract(id);
  return prisma.contract.update({
    where: { id },
    data: { signedAt: new Date(), signedDigitallyPhone: !!signedDigitallyPhone },
    include: includeRelations,
  });
};
