import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateJWT, requireAdmin, dashboardController.getStats);
router.get('/income', authenticateJWT, requireAdmin, dashboardController.getIncome);
router.get('/payment-stats', authenticateJWT, requireAdmin, dashboardController.getPaymentStats);

export default router;
