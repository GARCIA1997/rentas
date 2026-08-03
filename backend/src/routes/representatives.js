import express from 'express';
import * as representativeController from '../controllers/representativeController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get('/', representativeController.list);
router.get('/:id', representativeController.getOne);
router.post('/', representativeController.create);
router.put('/:id', representativeController.update);
router.delete('/:id', representativeController.remove);

export default router;
