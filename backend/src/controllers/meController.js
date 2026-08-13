import * as meService from '../services/meService.js';
import * as reportService from '../services/reportService.js';
import * as notificationService from '../services/notificationService.js';
import * as pushService from '../services/pushService.js';

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

export const getSettings = async (req, res, next) => {
  try {
    const settings = await meService.getMySettings(req.user.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await meService.updateMySettings(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req, res, next) => {
  try {
    res.status(201).json(await reportService.createReport(req.user.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req, res, next) => {
  try {
    res.json(await reportService.getMyReports(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const getMyReportDetail = async (req, res, next) => {
  try {
    res.json(await reportService.getMyReportDetail(req.user.id, req.params.id));
  } catch (error) {
    next(error);
  }
};

export const addMyReportMessage = async (req, res, next) => {
  try {
    res.status(201).json(await reportService.addTenantMessage(req.user.id, req.params.id, req.body.body));
  } catch (error) {
    next(error);
  }
};

export const savePushSubscription = async (req, res, next) => {
  try {
    await pushService.saveSubscription(req.user.id, req.body);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const removePushSubscription = async (req, res, next) => {
  try {
    await pushService.removeSubscription(req.body.endpoint);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

// Notificaciones: mismo endpoint para admin e inquilino, cada quien ve las suyas —
// NotificationLog.userId ya filtra por dueño, no hace falta split admin/tenant aquí.
export const getMyNotifications = async (req, res, next) => {
  try {
    res.json(await notificationService.getMyNotifications(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const getUnreadNotificationCount = async (req, res, next) => {
  try {
    res.json({ count: await notificationService.getUnreadCount(req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const markNotificationsAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
