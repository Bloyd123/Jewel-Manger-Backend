import express from 'express';
import {
  addPayment,
  getPaymentsByGirvi,
  getPaymentById,
  getShopPayments,
  deletePayment,
} from './girviPayment.controller.js';
import {
  addPaymentValidation,
  getPaymentsValidation,
  getShopPaymentsValidation,
  shopIdValidation,
  girviIdValidation,
  paymentIdValidation,
} from './girviPayment.validation.js';
import { authenticate }    from '../middlewares/auth.js';
import { restrictTo }      from '../middlewares/restrictTo.js';
import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
} from '../middlewares/checkShopAccess.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

// ─── Girvi-level Payment Router (/api/v1/shops/:shopId/girvi/:girviId/payments)
export const girviPaymentRouter = express.Router({ mergeParams: true });

girviPaymentRouter.use(authenticate);

/**
 * @route   POST /api/v1/shops/:shopId/girvi/:girviId/payments
 * @desc    Add payment to a girvi
 * @access  Private (Admin, Manager, Staff)
 */
girviPaymentRouter.post(
  '/',
  shopIdValidation,
  girviIdValidation,
  addPaymentValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canAddGirviPayment', 'canManageGirvi']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  addPayment
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/payments
 * @desc    Get all payments for a girvi
 * @access  Private (All staff)
 */
girviPaymentRouter.get(
  '/',
  shopIdValidation,
  girviIdValidation,
  getPaymentsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getPaymentsByGirvi
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/payments/:paymentId
 * @desc    Get single payment detail
 * @access  Private (All staff)
 */
girviPaymentRouter.get(
  '/:paymentId',
  shopIdValidation,
  girviIdValidation,
  paymentIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getPaymentById
);

/**
 * @route   DELETE /api/v1/shops/:shopId/girvi/:girviId/payments/:paymentId
 * @desc    Delete a payment (soft delete, reverses girvi balance)
 * @access  Private (Admin only)
 */
girviPaymentRouter.delete(
  '/:paymentId',
  shopIdValidation,
  girviIdValidation,
  paymentIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkAnyPermission(['canDeleteGirviPayment', 'canManageGirvi']),
  rateLimiter({ max: 20, windowMs: 60000 }),
  deletePayment
);

// ─── Shop-level Payment Router (/api/v1/shops/:shopId/girvi-payments)
export const shopPaymentRouter = express.Router({ mergeParams: true });

shopPaymentRouter.use(authenticate);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-payments
 * @desc    Get all girvi payments for a shop (across all girvis)
 * @access  Private (Admin, Manager, Accountant)
 */
shopPaymentRouter.get(
  '/',
  getShopPaymentsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  getShopPayments
);

export default girviPaymentRouter;