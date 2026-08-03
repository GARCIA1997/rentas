import express from 'express';
import * as meController from '../controllers/meController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/tenant', meController.getTenant);
router.get('/contracts', meController.getContracts);
router.get('/payments', meController.getPayments);
router.get('/contracts/:id/pdf', meController.downloadContractPdf);
router.get('/payments/:id/receipt', meController.downloadReceipt);

export default router;
