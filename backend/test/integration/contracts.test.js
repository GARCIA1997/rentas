import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let adminToken, tenantId, propertyId, contractId;

beforeAll(async () => {
  // Create admin user and get token
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({
      phone: '5551234567',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
    });
  adminToken = regRes.body.accessToken;

  // Create property
  const propRes = await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Test Property',
      address: '123 Main St',
      city: 'Coahuayana de Hidalgo',
      postalCode: '28000',
      propertyType: 'HOUSE',
      rentalPrice: 5000,
      waterIncluded: true,
    });
  propertyId = propRes.body.id;

  // Create tenant
  const tenRes = await request(app)
    .post('/api/tenants')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: 'Test Tenant',
      email: 'tenant@test.com',
      phone: '5559876543',
    });
  tenantId = tenRes.body.id;
});

describe('Contract Endpoints', () => {
  test('POST /api/contracts - Create contract', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tenantId,
        propertyId,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        durationMonths: 12,
        paymentDay: 5,
        monthlyRent: 5000,
        depositAmount: 10000,
        waterIncluded: true,
        autoRenewal: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('DRAFT');
    contractId = res.body.id;
  });

  test('POST /api/contracts - Should fail with invalid duration', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tenantId,
        propertyId,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        durationMonths: 0,
        paymentDay: 5,
        monthlyRent: 5000,
        depositAmount: 10000,
        waterIncluded: true,
      });

    expect(res.status).toBe(422);
  });

  test('POST /api/contracts - Should fail with rent = 0', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tenantId,
        propertyId,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        durationMonths: 12,
        paymentDay: 5,
        monthlyRent: 0,
        depositAmount: 10000,
        waterIncluded: true,
      });

    expect(res.status).toBe(422);
  });

  test('GET /api/contracts/:id - Get single contract', async () => {
    const res = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(contractId);
  });

  test('GET /api/contracts - List contracts', async () => {
    const res = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Payment Endpoints', () => {
  test('GET /api/rent-payments/filter/overdue - Get overdue payments', async () => {
    const res = await request(app)
      .get('/api/rent-payments/filter/overdue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/rent-payments/filter/upcoming - Get upcoming payments', async () => {
    const res = await request(app)
      .get('/api/rent-payments/filter/upcoming?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/rent-payments/export/csv - Export payments', async () => {
    const res = await request(app)
      .get('/api/rent-payments/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
