import express from 'express';
import * as contractController from '../controllers/contractController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', contractController.list);
router.get('/:id', contractController.getOne);
router.post('/', contractController.create);
router.put('/:id', contractController.update);
router.delete('/:id', contractController.remove);
router.post('/:id/generate-pdf', contractController.generatePdf);
router.get('/:id/pdf', contractController.downloadPdf);
router.post('/:id/mark-signed', contractController.markSigned);

export default router;
