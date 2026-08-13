import express from 'express';
import * as meController from '../controllers/meController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/tenant', meController.getTenant);
router.get('/contracts', meController.getContracts);
router.get('/payments', meController.getPayments);
router.get('/contracts/:id/pdf', meController.downloadContractPdf);
router.get('/payments/:id/receipt', meController.downloadReceipt);
router.get('/settings', meController.getSettings);
router.put('/settings', meController.updateSettings);

router.post('/reports', meController.createReport);
router.get('/reports', meController.getMyReports);
router.get('/reports/:id', meController.getMyReportDetail);
router.post('/reports/:id/messages', meController.addMyReportMessage);

router.get('/notifications', meController.getMyNotifications);
router.get('/notifications/unread-count', meController.getUnreadNotificationCount);
router.put('/notifications/read-all', meController.markNotificationsAsRead);

router.post('/push-subscriptions', meController.savePushSubscription);
router.delete('/push-subscriptions', meController.removePushSubscription);

export default router;
