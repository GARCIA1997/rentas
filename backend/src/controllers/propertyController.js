import { body, validationResult } from 'express-validator';
import * as propertyService from '../services/propertyService.js';

const validators = [
  body('name').notEmpty().withMessage('Name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('postalCode').notEmpty().withMessage('Postal code is required'),
  body('propertyType').isIn(['HOUSE', 'LOCAL']).withMessage('Invalid property type'),
  body('rentalPrice').isFloat({ min: 0 }).withMessage('Rental price must be a positive number'),
  body('status').optional().isIn(['OCUPADA', 'LIBRE', 'MANTENIMIENTO']).withMessage('Invalid status'),
  body('waterIncluded').optional().isBoolean().withMessage('waterIncluded must be a boolean'),
];

const runValidators = async (req) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

export const list = async (req, res, next) => {
  try {
    const properties = await propertyService.listProperties();
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const property = await propertyService.getProperty(req.params.id);
    res.json(property);
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

    const property = await propertyService.createProperty(req.body, req.user.id);
    res.status(201).json(property);
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

    const property = await propertyService.updateProperty(req.params.id, req.body);
    res.json(property);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await propertyService.deleteProperty(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
