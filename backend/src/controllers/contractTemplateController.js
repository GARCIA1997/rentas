import * as contractTemplateService from '../services/contractTemplateService.js';

export const list = async (req, res, next) => {
  try {
    res.json(await contractTemplateService.listTemplates());
  } catch (error) {
    next(error);
  }
};
