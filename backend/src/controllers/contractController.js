import { body, validationResult } from 'express-validator';
import * as contractService from '../services/contractService.js';

// Shared between create/update: the terms that can be set/edited.
const termValidators = [
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date required')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  body('durationMonths').isInt({ min: 1, max: 360 }).withMessage('Duration must be between 1 and 360 months'),
  body('paymentDay').isInt({ min: 1, max: 31 }).withMessage('Payment day must be between 1 and 31'),
  body('monthlyRent').isFloat({ min: 0.01 }).withMessage('Monthly rent must be greater than 0'),
  body('depositAmount').isFloat({ min: 0 }).withMessage('Deposit amount cannot be negative'),
  body('waterIncluded').optional().isBoolean(),
  body('autoRenewal').optional().isBoolean(),
];

// tenantId/propertyId are only set at creation — the auto-generated payment
// schedule is tied to them, so they aren't editable afterwards.
const createValidators = [
  body('tenantId').notEmpty().withMessage('Tenant is required'),
  body('propertyId').notEmpty().withMessage('Property is required'),
  ...termValidators,
];

const cancelValidators = [
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required').isLength({ max: 1000 }),
];

const runValidators = async (req, validators) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

export const list = async (req, res, next) => {
  try {
    res.json(await contractService.listContracts());
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    res.json(await contractService.getContract(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const errors = await runValidators(req, createValidators);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const contract = await contractService.createContract(req.body);
    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const errors = await runValidators(req, termValidators);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const contract = await contractService.updateContract(req.params.id, req.body);
    res.json(contract);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await contractService.deleteContract(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const generatePdf = async (req, res, next) => {
  try {
    const contract = await contractService.generateContractPdf(req.params.id);
    res.json(contract);
  } catch (error) {
    next(error);
  }
};

export const downloadPdf = async (req, res, next) => {
  try {
    const filePath = await contractService.getContractPdfPath(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${req.params.id}.pdf"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

export const markSigned = async (req, res, next) => {
  try {
    const contract = await contractService.markAsSigned(req.params.id, req.body.signedDigitallyPhone);
    res.json(contract);
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const errors = await runValidators(req, cancelValidators);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const contract = await contractService.cancelContract(req.params.id, req.body.reason);
    res.json(contract);
  } catch (error) {
    next(error);
  }
};

// Get all contracts eligible for renewal (within 2 months of end date)
export const getRenewalAlerts = async (req, res, next) => {
  try {
    const contracts = await contractService.getContractsNeedingRenewal();
    res.json(contracts);
  } catch (error) {
    next(error);
  }
};

// Initiate a contract renewal: create new DRAFT contract from previous one
// POST /api/contracts/:id/renew
// Body: { monthlyRent, durationMonths, representativeId? }
export const initiateRenewal = async (req, res, next) => {
  try {
    const renewalValidators = [
      body('monthlyRent').isFloat({ min: 0.01 }).withMessage('Monthly rent must be greater than 0'),
      body('durationMonths').isInt({ min: 1, max: 360 }).withMessage('Duration must be between 1 and 360 months'),
      body('representativeId').optional().isString(),
    ];

    const errors = await runValidators(req, renewalValidators);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // Convert to correct types
    const renewalData = {
      monthlyRent: Number(req.body.monthlyRent),
      durationMonths: Number(req.body.durationMonths),
      representativeId: req.body.representativeId,
    };

    const newContract = await contractService.renewContract(req.params.id, renewalData);
    res.status(201).json(newContract);
  } catch (error) {
    next(error);
  }
};
