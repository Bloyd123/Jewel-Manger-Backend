// FILE: src/api/metal-rates/metalRate.routes.js

import express from 'express';
import metalRateController from './metalRate.controller.js';
import metalRateValidation from './metalRate.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import rateLimiter from '../middlewares/rateLimiter.js';

const router = express.Router();

// POST /api/v1/shops/:shopId/metal-rates
router.post(
  '/shops/:shopId/metal-rates',
  authenticate,
  checkShopAccess,
  checkPermission('canUpdateMetalRates'),
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.createOrUpdateRate,
  metalRateController.createOrUpdateTodayRate
);

// GET /api/v1/shops/:shopId/metal-rates/current
router.get(
  '/shops/:shopId/metal-rates/current',
  authenticate,
  checkShopAccess,
  rateLimiter({ max: 100, windowMs: 60 * 1000 }),
  metalRateController.getCurrentRate
);

// GET /api/v1/shops/:shopId/metal-rates/history
router.get(
  '/shops/:shopId/metal-rates/history',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getRateHistory,
  metalRateController.getRateHistory
);

// GET /api/v1/shops/:shopId/metal-rates/latest
router.get(
  '/shops/:shopId/metal-rates/latest',
  authenticate,
  checkShopAccess,
  checkPermission('canViewDashboard'),
  metalRateController.getLatestRates
);

// GET /api/v1/shops/:shopId/metal-rates/trends
router.get(
  '/shops/:shopId/metal-rates/trends',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getTrendData,
  metalRateController.getTrendChartData
);

// GET /api/v1/shops/:shopId/metal-rates/compare
router.get(
  '/shops/:shopId/metal-rates/compare',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.compareRates,
  metalRateController.compareRates
);

// GET /api/v1/shops/:shopId/metal-rates/date/:date
router.get(
  '/shops/:shopId/metal-rates/date/:date',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getRateByDate,
  metalRateController.getRateByDate
);
// GET /api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity
router.get(
  '/shops/:shopId/metal-rates/current/purity/:metalType/:purity',
  authenticate,
  checkShopAccess,
  metalRateValidation.getRateForPurity,
  metalRateController.getRateForPurity
);

// GET /api/v1/shops/:shopId/metal-rates/average
router.get(
  '/shops/:shopId/metal-rates/average',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getAverageRate,
  metalRateController.getAverageRate
);
// POST /api/v1/organizations/:organizationId/metal-rates/sync
router.post(
  '/organizations/:organizationId/metal-rates/sync',
  authenticate,
  restrictTo('super_admin', 'org_admin'),
  rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.createOrUpdateRate,
  metalRateController.syncToAllShops
);
// GET /api/v1/organizations/:organizationId/metal-rates/current
router.get(
  '/organizations/:organizationId/metal-rates/current',
  authenticate,
  restrictTo('super_admin', 'org_admin'),
  metalRateController.getOrganizationRate
);
// PATCH /api/v1/metal-rates/:rateId/deactivate
router.patch(
  '/metal-rates/:rateId/deactivate',
  authenticate,
  rateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.rateIdParam,
  metalRateController.deactivateRate
);
// DELETE /api/v1/metal-rates/:rateId
router.delete(
  '/metal-rates/:rateId',
  authenticate,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.rateIdParam,
  metalRateController.deleteRate
);
export default router;
