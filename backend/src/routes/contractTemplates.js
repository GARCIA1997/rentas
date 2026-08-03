import express from 'express';
import * as contractTemplateController from '../controllers/contractTemplateController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateJWT, requireAdmin, contractTemplateController.list);

export default router;
