import { body, validationResult } from 'express-validator';
import * as tenantService from '../services/tenantService.js';

const validators = [
  body('propertyId').notEmpty().withMessage('Property is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email required'),
  body('phone').optional({ values: 'falsy' }).matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('moveInDate').isISO8601().withMessage('Valid move-in date required'),
  body('status').optional().isIn(['ACTIVE', 'EVICTED', 'MOVED_OUT']).withMessage('Invalid status'),
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

    const tenant = await tenantService.createTenant(req.body);
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
