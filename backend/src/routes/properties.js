import express from 'express';
import * as propertyController from '../controllers/propertyController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', propertyController.list);
router.get('/:id', propertyController.getOne);
router.get('/:id/detail', propertyController.getDetail);
router.post('/', propertyController.create);
router.put('/:id', propertyController.update);
router.delete('/:id', propertyController.remove);

export default router;
