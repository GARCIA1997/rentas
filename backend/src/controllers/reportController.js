import * as reportService from '../services/reportService.js';

export const list = async (req, res, next) => {
  try {
    res.json(await reportService.listReports());
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req, res, next) => {
  try {
    res.json(await reportService.getReportDetail(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const addMessage = async (req, res, next) => {
  try {
    res.status(201).json(await reportService.addAdminMessage(req.params.id, req.user.id, req.body.body));
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    res.json(await reportService.updateReportStatus(req.params.id, req.body.status));
  } catch (error) {
    next(error);
  }
};
