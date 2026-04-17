import express from 'express';
import * as metalController from './metal.controller.js';
import * as metalValidation from './metal.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { apiRateLimiter, createUpdateRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET /api/v1/shops/:shopId/metal-ledger/summary
router.get(
  '/summary',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  apiRateLimiter,
  metalController.getShopSummary
);

// GET /api/v1/shops/:shopId/metal-ledger/pending
router.get(
  '/pending',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  apiRateLimiter,
  metalValidation.getPendingEntries,
  metalController.getPendingEntries
);

// POST /api/v1/shops/:shopId/metal-ledger
router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  createUpdateRateLimiter,
  metalValidation.createEntry,
  metalController.createEntry
);

// GET /api/v1/shops/:shopId/metal-ledger/party/:partyId/balance
router.get(
  '/party/:partyId/balance',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  apiRateLimiter,
  metalValidation.partyId,
  metalController.getPartyBalance
);

// GET /api/v1/shops/:shopId/metal-ledger/party/:partyId/history
router.get(
  '/party/:partyId/history',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  apiRateLimiter,
  metalValidation.partyId,
  metalController.getPartyHistory
);

// POST /api/v1/shops/:shopId/metal-ledger/:entryId/settle
router.post(
  '/:entryId/settle',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  createUpdateRateLimiter,
  metalValidation.settleEntry,
  metalController.settleEntry
);

// POST /api/v1/shops/:shopId/metal-ledger/bulk-settle
router.post(
  '/bulk-settle',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  createUpdateRateLimiter,
  metalValidation.bulkSettle,
  metalController.bulkSettle
);

export default router;