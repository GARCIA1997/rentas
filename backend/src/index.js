import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import tenantRoutes from './routes/tenants.js';
import representativeRoutes from './routes/representatives.js';
import dashboardRoutes from './routes/dashboard.js';
import contractRoutes from './routes/contracts.js';
import contractTemplateRoutes from './routes/contractTemplates.js';
import rentPaymentRoutes from './routes/rentPayments.js';
import meRoutes from './routes/me.js';
import inviteRoutes from './routes/invites.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000'),
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/representatives', representativeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/contract-templates', contractTemplateRoutes);
app.use('/api/rent-payments', rentPaymentRoutes);
app.use('/api/me', meRoutes);
app.use('/api/invites', inviteRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Sólo se escucha cuando este archivo es el punto de entrada. Al importarlo (smoke test,
// pruebas de integración) el consumidor decide en qué puerto levantarlo, o si levantarlo.
const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}

// Export for testing
export { app, prisma };
