import * as meService from '../services/meService.js';

export const getTenant = async (req, res, next) => {
  try {
    res.json(await meService.getMyTenant(req.user.id));
  } catch (error) {
    if (error.status === 404) {
      return res.json(null);
    }
    next(error);
  }
};

export const getContracts = async (req, res, next) => {
  try {
    res.json(await meService.getMyContracts(req.user.id));
  } catch (error) {
    if (error.status === 404) {
      return res.json([]);
    }
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    res.json(await meService.getMyPayments(req.user.id));
  } catch (error) {
    if (error.status === 404) {
      return res.json([]);
    }
    next(error);
  }
};

export const downloadContractPdf = async (req, res, next) => {
  try {
    const filePath = await meService.getMyContractPdfPath(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${req.params.id}.pdf"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

export const downloadReceipt = async (req, res, next) => {
  try {
    const pdfBuffer = await meService.getMyReceiptPdf(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
