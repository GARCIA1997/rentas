import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { issueTokens } from './authService.js';

const prisma = new PrismaClient();

const INVITE_TTL_DAYS = 7;

// Único mecanismo de alta de cuentas: no hay registro público abierto. Un admin genera
// la invitación; el token viaja en la URL, así que debe ser largo e impredecible.
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Separa "Juan Carlos Pérez López" en { firstName: 'Juan', lastName: 'Carlos Pérez López' }.
// Tenant.fullName es un solo campo; User necesita firstName/lastName por separado, y el
// split exacto no importa para nada funcional (login es por teléfono, no por nombre).
const splitFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') || firstName };
};

export const createInvite = async ({ role, tenantId, createdByUserId }) => {
  if (role === 'INQUILINO') {
    if (!tenantId) {
      throw { status: 400, message: 'tenantId is required for tenant invites' };
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw { status: 404, message: 'Tenant not found' };
    }
    if (tenant.userId) {
      throw { status: 400, message: 'This tenant already has a linked account' };
    }
    if (!tenant.phone) {
      throw { status: 400, message: 'Tenant needs a phone number before it can be invited (used to log in)' };
    }
  }

  const invite = await prisma.registrationInvite.create({
    data: {
      token: generateToken(),
      role,
      tenantId: role === 'INQUILINO' ? tenantId : null,
      createdBy: createdByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return invite;
};

// Valida el token y devuelve sólo lo que la pantalla de registro necesita mostrar —
// nunca datos sensibles del tenant más allá de nombre/teléfono para confirmarle a quien
// abre el link que el enlace es el suyo.
export const getInviteDetails = async (token) => {
  const invite = await prisma.registrationInvite.findUnique({
    where: { token },
    include: { tenant: { select: { fullName: true, phone: true } } },
  });

  if (!invite) {
    throw { status: 404, message: 'Invitation not found' };
  }
  if (invite.usedAt) {
    throw { status: 410, message: 'This invitation has already been used' };
  }
  if (invite.expiresAt < new Date()) {
    throw { status: 410, message: 'This invitation has expired' };
  }

  return {
    role: invite.role,
    tenant: invite.tenant ? { fullName: invite.tenant.fullName, phone: invite.tenant.phone } : null,
  };
};

const acceptAdminInvite = async (tx, invite, { phone, password, firstName, lastName, email }) => {
  if (!phone || !password || !firstName || !lastName) {
    throw { status: 400, message: 'phone, password, firstName and lastName are required' };
  }
  if (!/^\d{10}$/.test(phone)) {
    throw { status: 400, message: 'Phone must be 10 digits' };
  }
  const existing = await tx.user.findUnique({ where: { phone } });
  if (existing) {
    throw { status: 400, message: 'Phone already registered' };
  }

  const passwordHash = await bcryptjs.hash(password, 10);
  return tx.user.create({
    data: { phone, passwordHash, firstName, lastName, email, role: 'ADMIN', status: 'ACTIVE' },
  });
};

const acceptTenantInvite = async (tx, invite, { password }) => {
  if (!password || password.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters' };
  }

  const tenant = await tx.tenant.findUnique({ where: { id: invite.tenantId } });
  if (!tenant) {
    throw { status: 404, message: 'Tenant not found' };
  }
  if (tenant.userId) {
    throw { status: 400, message: 'This tenant already has a linked account' };
  }

  const existing = await tx.user.findUnique({ where: { phone: tenant.phone } });
  if (existing) {
    throw { status: 400, message: 'Phone already registered' };
  }

  const { firstName, lastName } = splitFullName(tenant.fullName);
  const passwordHash = await bcryptjs.hash(password, 10);
  const user = await tx.user.create({
    data: {
      phone: tenant.phone,
      passwordHash,
      firstName,
      lastName,
      email: tenant.email,
      role: 'INQUILINO',
      status: 'ACTIVE',
    },
  });

  // Enlace directo por id, no por coincidencia de teléfono: el link ya identifica al
  // tenant exacto, así que no hace falta el heurístico de "match por teléfono" de antes.
  await tx.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });

  return user;
};

export const acceptInvite = async (token, payload) => {
  const invite = await prisma.registrationInvite.findUnique({ where: { token } });

  if (!invite) throw { status: 404, message: 'Invitation not found' };
  if (invite.usedAt) throw { status: 410, message: 'This invitation has already been used' };
  if (invite.expiresAt < new Date()) throw { status: 410, message: 'This invitation has expired' };

  const user = await prisma.$transaction(async (tx) => {
    const newUser =
      invite.role === 'ADMIN' ? await acceptAdminInvite(tx, invite, payload) : await acceptTenantInvite(tx, invite, payload);

    await tx.registrationInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedByUserId: newUser.id },
    });

    return newUser;
  });

  return issueTokens(user);
};
