import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { preprocessImageForOcr } from './imagePreprocessor.js';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'tenants');

// Tenants no longer carry a direct property FK — their current property (if
// any) is derived from their active contract, if they have one.
const activeContractInclude = {
  contracts: {
    where: { status: 'ACTIVE' },
    include: { property: { select: { id: true, name: true, city: true } } },
    orderBy: { startDate: 'desc' },
    take: 1,
  },
};

export const listTenants = async () => {
  return prisma.tenant.findMany({
    include: activeContractInclude,
    orderBy: { createdAt: 'desc' },
  });
};

export const getTenant = async (id) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: activeContractInclude,
  });

  if (!tenant) {
    throw { status: 404, message: 'Tenant not found' };
  }

  return tenant;
};

// Links a tenant record to a self-registered user account when their phone
// numbers match, so the tenant portal can find "their" data regardless of
// whether they registered before or after the admin created the tenant record.
const findMatchingUserId = async (phone) => {
  if (!phone) return null;
  const user = await prisma.user.findFirst({ where: { phone, role: 'INQUILINO' } });
  return user?.id ?? null;
};

export const createTenant = async (data) => {
  const userId = await findMatchingUserId(data.phone);

  return prisma.tenant.create({
    data: {
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      status: data.status ?? 'ACTIVE',
      notes: data.notes,
      address: data.address,
      curp: data.curp,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  });
};

export const updateTenant = async (id, data) => {
  const existing = await getTenant(id);

  const userId =
    data.phone && data.phone !== existing.phone ? await findMatchingUserId(data.phone) : undefined;

  return prisma.tenant.update({
    where: { id },
    data: {
      userId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      idDocument: data.idDocument,
      status: data.status,
      notes: data.notes,
      address: data.address,
      curp: data.curp,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  });
};

export const deleteTenant = async (id) => {
  await getTenant(id);
  await prisma.tenant.delete({ where: { id } });
};

// Guarda las fotos del INE tras crear el tenant (necesita el id para el nombre de carpeta).
// Se conservan como respaldo — decisión explícita, no sólo procesar-y-descartar — así que
// viven fuera del control de versiones y se sirven únicamente por rutas autenticadas de
// admin (ver tenantController.getIneFront/getIneBack), nunca de forma pública.
// Las imágenes se preprocesan para mejorar la legibilidad (contraste, escala de grises).
export const saveIneImages = async (tenantId, { front, back }) => {
  if (!front && !back) return getTenant(tenantId);

  const dir = path.join(UPLOADS_DIR, tenantId);
  fs.mkdirSync(dir, { recursive: true });

  const data = {};
  if (front) {
    try {
      const processedBuffer = await preprocessImageForOcr(front.buffer);
      const fileName = `front${path.extname(front.originalname) || '.jpg'}`;
      fs.writeFileSync(path.join(dir, fileName), processedBuffer);
      data.ineFrontUrl = `/uploads/tenants/${tenantId}/${fileName}`;
    } catch (error) {
      console.error(`Error preprocessing front image for tenant ${tenantId}:`, error);
      // Fallback: guardar imagen original sin procesar
      const fileName = `front${path.extname(front.originalname) || '.jpg'}`;
      fs.writeFileSync(path.join(dir, fileName), front.buffer);
      data.ineFrontUrl = `/uploads/tenants/${tenantId}/${fileName}`;
    }
  }
  if (back) {
    try {
      const processedBuffer = await preprocessImageForOcr(back.buffer);
      const fileName = `back${path.extname(back.originalname) || '.jpg'}`;
      fs.writeFileSync(path.join(dir, fileName), processedBuffer);
      data.ineBackUrl = `/uploads/tenants/${tenantId}/${fileName}`;
    } catch (error) {
      console.error(`Error preprocessing back image for tenant ${tenantId}:`, error);
      // Fallback: guardar imagen original sin procesar
      const fileName = `back${path.extname(back.originalname) || '.jpg'}`;
      fs.writeFileSync(path.join(dir, fileName), back.buffer);
      data.ineBackUrl = `/uploads/tenants/${tenantId}/${fileName}`;
    }
  }

  return prisma.tenant.update({ where: { id: tenantId }, data });
};

// Devuelve la ruta absoluta en disco de la foto pedida, o null si no existe — el
// controller decide qué responder (404 vs. sendFile) según lo que reciba.
export const getIneImagePath = async (tenantId, side) => {
  const tenant = await getTenant(tenantId);
  const url = side === 'front' ? tenant.ineFrontUrl : tenant.ineBackUrl;
  if (!url) return null;
  return path.join(process.cwd(), url.replace(/^\//, ''));
};
