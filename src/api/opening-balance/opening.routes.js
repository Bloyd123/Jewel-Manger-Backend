import express from 'express';
import * as openingController from './opening.controller.js';
import * as openingValidation from './opening.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess } from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { apiRateLimiter, createUpdateRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET /api/v1/shops/:shopId/opening-balance/status
router.get(
  '/status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  apiRateLimiter,
  openingController.getSetupStatus
);

// GET /api/v1/shops/:shopId/opening-balance
router.get(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  apiRateLimiter,
  openingController.getOpeningBalance
);

// POST /api/v1/shops/:shopId/opening-balance
// Draft save karo - koi bhi baar save kar sakte ho confirm se pehle
router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  createUpdateRateLimiter,
  openingValidation.createOrUpdate,
  openingController.createOrUpdate
);

// POST /api/v1/shops/:shopId/opening-balance/confirm
// Ek baar confirm hone ke baad lock ho jaata hai
router.post(
  '/confirm',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  createUpdateRateLimiter,
  openingController.confirmOpeningBalance
);

export default router;