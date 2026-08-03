import { body, validationResult } from 'express-validator';
import * as representativeService from '../services/representativeService.js';

const validators = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email required'),
  body('phone').optional({ values: 'falsy' }).matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const runValidators = async (req) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

export const list = async (req, res, next) => {
  try {
    const representatives = await representativeService.listRepresentatives();
    res.json(representatives);
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const representative = await representativeService.getRepresentative(req.params.id);
    res.json(representative);
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

    const representative = await representativeService.createRepresentative(req.body, req.user.id);
    res.status(201).json(representative);
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

    const representative = await representativeService.updateRepresentative(req.params.id, req.body);
    res.json(representative);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await representativeService.deleteRepresentative(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
