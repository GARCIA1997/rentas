import * as dashboardService from '../services/dashboardService.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getIncome = async (req, res, next) => {
  try {
    res.json(await dashboardService.getMonthlyIncome());
  } catch (error) {
    next(error);
  }
};

export const getPaymentStats = async (req, res, next) => {
  try {
    res.json(await dashboardService.getPaymentStats());
  } catch (error) {
    next(error);
  }
};
