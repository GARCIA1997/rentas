import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', reportController.list);
router.get('/:id', reportController.getDetail);
router.post('/:id/messages', reportController.addMessage);
router.put('/:id/status', reportController.updateStatus);

export default router;
