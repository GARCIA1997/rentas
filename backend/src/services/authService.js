import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const loginUser = async (phone, password) => {
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (user.status !== 'ACTIVE') {
    throw { status: 403, message: 'User account is inactive' };
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  };
};

export const registerTenant = async (phone, password, firstName, lastName, email) => {
  // Check if phone already exists
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  if (existingUser) {
    throw { status: 400, message: 'Phone already registered' };
  }

  // Validate phone format (10 digits)
  if (!/^\d{10}$/.test(phone)) {
    throw { status: 400, message: 'Phone must be 10 digits' };
  }

  // Hash password
  const passwordHash = await bcryptjs.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      firstName,
      lastName,
      email,
      role: 'INQUILINO',
      status: 'ACTIVE',
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  };
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.status !== 'ACTIVE') {
      throw { status: 403, message: 'User not found or inactive' };
    }

    const newAccessToken = generateAccessToken(user);
    return { accessToken: newAccessToken };
  } catch (error) {
    throw { status: 403, message: 'Invalid refresh token' };
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
      type: 'access',
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};
