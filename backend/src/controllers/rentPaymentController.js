import { body, validationResult } from 'express-validator';
import * as rentPaymentService from '../services/rentPaymentService.js';

// Full validation for creation — every payment needs a contract, due date and amount.
const createValidators = [
  body('contractId').notEmpty().withMessage('Contract is required'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  body('amountDue')
    .isFloat({ min: 0.01 })
    .withMessage('Amount due must be greater than 0'),
  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid cannot be negative'),
  body('paymentMethod')
    .optional()
    .isIn(['MANUAL', 'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE'])
    .withMessage('Invalid payment method'),
  body('notes').optional().trim(),
];

// Updates are partial — e.g. registering an installment only sends
// amountPaid/paidDate/paymentMethod, so nothing here is required.
const updateValidators = [
  body('contractId').optional().notEmpty().withMessage('Contract is required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date required'),
  body('amountDue')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount due must be greater than 0'),
  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid cannot be negative'),
  body('paymentMethod')
    .optional()
    .isIn(['MANUAL', 'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE'])
    .withMessage('Invalid payment method'),
  body('notes').optional().trim(),
];

const runValidators = async (req, validators) => {
  await Promise.all(validators.map((v) => v.run(req)));
  return validationResult(req);
};

export const list = async (req, res, next) => {
  try {
    res.json(await rentPaymentService.listPayments());
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    res.json(await rentPaymentService.getPayment(req.params.id));
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

    const payment = await rentPaymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const errors = await runValidators(req, updateValidators);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const payment = await rentPaymentService.updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await rentPaymentService.deletePayment(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const markPaid = async (req, res, next) => {
  try {
    const payment = await rentPaymentService.markAsPaid(req.params.id, req.body.paymentMethod);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

export const getOverdue = async (req, res, next) => {
  try {
    const payments = await rentPaymentService.getOverduePayments();
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const getUpcoming = async (req, res, next) => {
  try {
    const daysAhead = req.query.days ? parseInt(req.query.days, 10) : 7;
    const payments = await rentPaymentService.getUpcomingPayments(daysAhead);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const downloadReceipt = async (req, res, next) => {
  try {
    const pdfBuffer = await rentPaymentService.generateReceiptPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const exportCSV = async (req, res, next) => {
  try {
    const csv = await rentPaymentService.generatePaymentsCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pagos.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
