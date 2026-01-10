// FILE: src/api/metal-rates/metalRate.routes.js
// Metal Rate Management - Route Definitions

import express from 'express';
import metalRateController from './metalRate.controller.js';
import metalRateValidation from './metalRate.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import rateLimiter from '../middlewares/rateLimiter.js';

const router = express.Router();

// SHOP-LEVEL ROUTES (PREFIX: /api/v1/shops/:shopId/metal-rates)

// CREATE OR UPDATE TODAY'S RATE
// POST /api/v1/shops/:shopId/metal-rates
// Permission: canUpdateMetalRates
// Rate limit: 10 requests per 15 minutes

router.post(
  '/shops/:shopId/metal-rates',
  authenticate,
  checkShopAccess,
  checkPermission('canUpdateMetalRates'),
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.createOrUpdateRate,
  metalRateController.createOrUpdateTodayRate
);

// GET CURRENT RATE (MOST USED - HEAVILY CACHED)
// GET /api/v1/shops/:shopId/metal-rates/current
// Permission: Any shop access (canViewDashboard or any permission)
// Rate limit: 100 requests per minute

router.get(
  '/shops/:shopId/metal-rates/current',
  authenticate,
  checkShopAccess,
  rateLimiter({ max: 100, windowMs: 60 * 1000 }),
  metalRateController.getCurrentRate
);

// GET RATE HISTORY
// GET /api/v1/shops/:shopId/metal-rates/history
// Permission: canViewReports
// Query: ?startDate=2024-11-01&endDate=2024-11-10&page=1&limit=10

router.get(
  '/shops/:shopId/metal-rates/history',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getRateHistory,
  metalRateController.getRateHistory
);

// GET LATEST RATES (RECENT 10)
// GET /api/v1/shops/:shopId/metal-rates/latest
// Permission: canViewDashboard

router.get(
  '/shops/:shopId/metal-rates/latest',
  authenticate,
  checkShopAccess,
  checkPermission('canViewDashboard'),
  metalRateController.getLatestRates
);

// GET TREND CHART DATA (NEW FEATURE)
// GET /api/v1/shops/:shopId/metal-rates/trends
// Permission: canViewReports
// Query: ?metalType=gold&days=90

router.get(
  '/shops/:shopId/metal-rates/trends',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getTrendData,
  metalRateController.getTrendChartData
);

// COMPARE RATES BETWEEN TWO DATES
// GET /api/v1/shops/:shopId/metal-rates/compare
// Permission: canViewReports
// Query: ?fromDate=2024-11-01&toDate=2024-11-10

router.get(
  '/shops/:shopId/metal-rates/compare',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.compareRates,
  metalRateController.compareRates
);

// GET RATE BY SPECIFIC DATE
// GET /api/v1/shops/:shopId/metal-rates/date/:date
// Permission: canViewReports
// Example: /date/2024-11-05

router.get(
  '/shops/:shopId/metal-rates/date/:date',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getRateByDate,
  metalRateController.getRateByDate
);

// GET RATE FOR SPECIFIC PURITY
// GET /api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity
// Permission: Any shop access
// Example: /current/purity/gold/22K

router.get(
  '/shops/:shopId/metal-rates/current/purity/:metalType/:purity',
  authenticate,
  checkShopAccess,
  metalRateValidation.getRateForPurity,
  metalRateController.getRateForPurity
);

// GET AVERAGE RATE
// GET /api/v1/shops/:shopId/metal-rates/average
// Permission: canViewReports
// Query: ?metalType=gold&purity=24K&days=30

router.get(
  '/shops/:shopId/metal-rates/average',
  authenticate,
  checkShopAccess,
  checkPermission('canViewReports'),
  metalRateValidation.getAverageRate,
  metalRateController.getAverageRate
);

// ORGANIZATION-LEVEL ROUTES (PREFIX: /api/v1/organizations/:organizationId/metal-rates)

// MULTI-SHOP SYNC (ORGANIZATION LEVEL)
// POST /api/v1/organizations/:organizationId/metal-rates/sync
// Permission: super_admin, org_admin ONLY
// Rate limit: 5 requests per 15 minutes

router.post(
  '/organizations/:organizationId/metal-rates/sync',
  authenticate,
  restrictTo('super_admin', 'org_admin'),
  rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.createOrUpdateRate,
  metalRateController.syncToAllShops
);

// GET ORGANIZATION MASTER RATE
// GET /api/v1/organizations/:organizationId/metal-rates/current
// Permission: super_admin, org_admin

router.get(
  '/organizations/:organizationId/metal-rates/current',
  authenticate,
  restrictTo('super_admin', 'org_admin'),
  metalRateController.getOrganizationRate
);

// RATE-SPECIFIC ROUTES (PREFIX: /api/v1/metal-rates/:rateId)

// DEACTIVATE RATE
// PATCH /api/v1/metal-rates/:rateId/deactivate
// Permission: canUpdateMetalRates

router.patch(
  '/metal-rates/:rateId/deactivate',
  authenticate,
  rateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.rateIdParam,
  metalRateController.deactivateRate
);

// SOFT DELETE RATE
// DELETE /api/v1/metal-rates/:rateId
// Permission: canManageShopSettings (or super_admin, org_admin)

router.delete(
  '/metal-rates/:rateId',
  authenticate,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }),
  metalRateValidation.rateIdParam,
  metalRateController.deleteRate
);

// EXPORTS

export default router;
