import { body, validationResult } from 'express-validator';
import * as rentPaymentService from '../services/rentPaymentService.js';

const validators = [
  body('contractId').notEmpty().withMessage('Contract is required'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  body('amountDue').isFloat({ min: 0 }).withMessage('Amount due must be a positive number'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  body('paymentMethod').optional().isIn(['MANUAL', 'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE']),
];

const runValidators = async (req) => {
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
    const errors = await runValidators(req);
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
    const errors = await runValidators(req);
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
