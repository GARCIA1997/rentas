import { body, validationResult } from 'express-validator';
import * as inviteService from '../services/inviteService.js';

const runValidators = async (req, validators) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

// POST /api/invites — sólo un admin logueado puede generar invitaciones.
export const create = async (req, res, next) => {
  try {
    const errors = await runValidators(req, [
      body('role').isIn(['ADMIN', 'INQUILINO']).withMessage('role must be ADMIN or INQUILINO'),
      body('tenantId').if(body('role').equals('INQUILINO')).notEmpty().withMessage('tenantId is required for tenant invites'),
    ]);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const invite = await inviteService.createInvite({
      role: req.body.role,
      tenantId: req.body.tenantId,
      createdByUserId: req.user.id,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/register?token=${invite.token}`;
    res.status(201).json({ token: invite.token, link, role: invite.role, expiresAt: invite.expiresAt });
  } catch (error) {
    next(error);
  }
};

// GET /api/invites/:token — público, sin auth: es lo primero que carga la pantalla de
// registro para saber qué mostrar (formulario de admin, o datos del tenant + password).
export const getByToken = async (req, res, next) => {
  try {
    const details = await inviteService.getInviteDetails(req.params.token);
    res.json(details);
  } catch (error) {
    next(error);
  }
};

// POST /api/invites/:token/accept — público, sin auth: consume la invitación y crea la
// cuenta. La validación de campos varía según el rol, así que se hace dentro del service.
export const accept = async (req, res, next) => {
  try {
    const result = await inviteService.acceptInvite(req.params.token, req.body);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    next(error);
  }
};
