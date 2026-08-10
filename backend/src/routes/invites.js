import express from 'express';
import * as inviteController from '../controllers/inviteController.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Crear invitaciones requiere sesión de admin; consultarlas/aceptarlas es público —
// la seguridad vive en que el token es largo e impredecible, no en autenticación previa.
router.post('/', authenticateJWT, requireAdmin, inviteController.create);
router.get('/:token', inviteController.getByToken);
router.post('/:token/accept', inviteController.accept);

export default router;
