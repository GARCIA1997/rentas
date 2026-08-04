import express from 'express';
import * as rentPaymentController from '../controllers/rentPaymentController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', rentPaymentController.list);
router.get('/filter/overdue', rentPaymentController.getOverdue);
router.get('/filter/upcoming', rentPaymentController.getUpcoming);
router.get('/:id', rentPaymentController.getOne);
router.post('/', rentPaymentController.create);
router.put('/:id', rentPaymentController.update);
router.delete('/:id', rentPaymentController.remove);
router.post('/:id/mark-paid', rentPaymentController.markPaid);
router.get('/:id/receipt', rentPaymentController.downloadReceipt);

export default router;
