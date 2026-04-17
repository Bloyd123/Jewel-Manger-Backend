import express from 'express';
import {
  transferOut,
  transferReturn,
  getTransfersByGirvi,
  getTransferById,
  getShopTransfers,
  calculatePartyInterest,
  cancelTransfer,
} from './girviTransfer.controller.js';
import {
  transferOutValidation,
  transferReturnValidation,
  getTransfersValidation,
  getShopTransfersValidation,
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
} from './girviTransfer.validation.js';
import { authenticate }    from '../middlewares/auth.js';
import { restrictTo }      from '../middlewares/restrictTo.js';
import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
} from '../middlewares/checkShopAccess.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

// ─── Girvi-level Transfer Router
// Mounted at: /api/v1/shops/:shopId/girvi/:girviId/transfers
export const girviTransferRouter = express.Router({ mergeParams: true });

girviTransferRouter.use(authenticate);

/**
 * @route   POST /api/v1/shops/:shopId/girvi/:girviId/transfers
 * @desc    Transfer girvi to another party (outgoing)
 * @access  Private (Admin, Manager)
 */
girviTransferRouter.post(
  '/',
  shopIdValidation,
  girviIdValidation,
  transferOutValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canTransferGirvi', 'canManageGirvi']),
  rateLimiter({ max: 20, windowMs: 60000 }),
  transferOut
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/transfers
 * @desc    Get all transfers for a girvi
 * @access  Private (All staff)
 */
girviTransferRouter.get(
  '/',
  shopIdValidation,
  girviIdValidation,
  getTransfersValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getTransfersByGirvi
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/transfers/:transferId
 * @desc    Get single transfer detail
 * @access  Private (All staff)
 */
girviTransferRouter.get(
  '/:transferId',
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getTransferById
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/transfers/:transferId/party-interest
 * @desc    Calculate party interest preview before return
 * @access  Private (Admin, Manager, Staff)
 */
girviTransferRouter.get(
  '/:transferId/party-interest',
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  calculatePartyInterest
);

/**
 * @route   PATCH /api/v1/shops/:shopId/girvi/:girviId/transfers/:transferId/return
 * @desc    Return transferred girvi back from party
 * @access  Private (Admin, Manager)
 */
girviTransferRouter.patch(
  '/:transferId/return',
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
  transferReturnValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canReturnGirviTransfer', 'canManageGirvi']),
  rateLimiter({ max: 20, windowMs: 60000 }),
  transferReturn
);

/**
 * @route   PATCH /api/v1/shops/:shopId/girvi/:girviId/transfers/:transferId/cancel
 * @desc    Cancel a pending transfer
 * @access  Private (Admin only)
 */
girviTransferRouter.patch(
  '/:transferId/cancel',
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkAnyPermission(['canCancelGirviTransfer', 'canManageGirvi']),
  rateLimiter({ max: 10, windowMs: 60000 }),
  cancelTransfer
);

// ─── Shop-level Transfer Router
// Mounted at: /api/v1/shops/:shopId/girvi-transfers
export const shopTransferRouter = express.Router({ mergeParams: true });

shopTransferRouter.use(authenticate);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-transfers
 * @desc    Get all girvi transfers for shop (across all girvis)
 * @access  Private (Admin, Manager, Accountant)
 */
shopTransferRouter.get(
  '/',
  getShopTransfersValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  getShopTransfers
);

export default girviTransferRouter;