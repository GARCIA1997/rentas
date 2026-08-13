import * as reportService from '../services/reportService.js';

export const list = async (req, res, next) => {
  try {
    res.json(await reportService.listReports());
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
