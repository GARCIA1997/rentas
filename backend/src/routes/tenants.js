import express from 'express';
import * as tenantController from '../controllers/tenantController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', tenantController.list);
router.get('/:id', tenantController.getOne);
router.get('/:id/ine-front', tenantController.getIneFront);
router.get('/:id/ine-back', tenantController.getIneBack);
router.get('/:id/reports', tenantController.getReports);
router.post('/', tenantController.uploadIneImages, tenantController.create);
router.put('/:id', tenantController.update);
router.delete('/:id', tenantController.remove);

export default router;
