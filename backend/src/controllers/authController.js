import { body, validationResult } from 'express-validator';
import * as authService from '../services/authService.js';

export const login = async (req, res, next) => {
  try {
    // Validation
    await body('phone').matches(/^\d{10}$/).withMessage('Phone must be 10 digits').run(req);
    await body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;
    const result = await authService.loginUser(phone, password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

// No hay registro público: las cuentas se crean únicamente aceptando una invitación
// (ver inviteController.js / POST /api/invites/:token/accept).

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken: result.accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};
