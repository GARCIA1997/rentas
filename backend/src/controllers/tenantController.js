import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as tenantService from '../services/tenantService.js';
import * as reportService from '../services/reportService.js';

// Las fotos del INE llegan como multipart junto con los demás campos, no como JSON —
// se guardan en memoria brevemente y tenantService las escribe a disco tras crear el
// tenant (necesita su id para el nombre de carpeta).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por foto, de sobra para una foto de celular
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});
export const uploadIneImages = upload.fields([
  { name: 'ineFront', maxCount: 1 },
  { name: 'ineBack', maxCount: 1 },
]);

// CURP: 4 letras, 6 dígitos (fecha AAMMDD), H/M, 5 letras, 1 alfanumérico, 1 dígito.
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

const validators = [
  body('fullName')
    .notEmpty()
    .trim()
    .withMessage('Full name is required')
    .isLength({ min: 3 })
    .withMessage('Full name must be at least 3 characters'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Valid email required'),
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^\d{10}$/)
    .withMessage('Phone must be 10 digits'),
  body('idDocument')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer((value) => value.toUpperCase())
    .matches(/^[A-Z0-9]{6,18}$/)
    .withMessage('ID document must be 6-18 alphanumeric characters'),
  body('status').optional().isIn(['ACTIVE', 'EVICTED', 'MOVED_OUT']).withMessage('Invalid status'),
  body('notes').optional({ values: 'null' }).trim().isLength({ max: 2000 }).withMessage('Notes must be under 2000 characters'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Address must be under 500 characters'),
  body('curp')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer((value) => value.toUpperCase())
    .matches(CURP_REGEX)
    .withMessage('CURP must be a valid 18-character CURP'),
  body('birthDate').optional({ values: 'falsy' }).isISO8601().withMessage('Valid birth date required'),
];

const runValidators = async (req) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

export const list = async (req, res, next) => {
  try {
    const tenants = await tenantService.listTenants();
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenant(req.params.id);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const errors = await runValidators(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let tenant = await tenantService.createTenant(req.body);

    // req.files sólo existe cuando la petición fue multipart (el wizard de escaneo de
    // INE); el alta manual normal sigue llegando como JSON y esto se salta sin más.
    const front = req.files?.ineFront?.[0];
    const back = req.files?.ineBack?.[0];
    if (front || back) {
      tenant = await tenantService.saveIneImages(tenant.id, { front, back });
    }

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const errors = await runValidators(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await tenantService.deleteTenant(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const sendIneImage = async (req, res, next, side) => {
  try {
    const filePath = await tenantService.getIneImagePath(req.params.id, side);
    if (!filePath) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

// Autenticadas por el mismo router.use(authenticateJWT, requireAdmin) que todo lo
// demás en routes/tenants.js — nunca públicas, son fotos de identificación oficial.
export const getIneFront = (req, res, next) => sendIneImage(req, res, next, 'front');
export const getIneBack = (req, res, next) => sendIneImage(req, res, next, 'back');

// Reportes de ESTE tenant — la vía principal del admin hacia sus conversaciones
// (perfil del inquilino → sus reportes), aparte del listado global de /reports.
export const getReports = async (req, res, next) => {
  try {
    res.json(await reportService.getTenantReports(req.params.id));
  } catch (error) {
    next(error);
  }
};
