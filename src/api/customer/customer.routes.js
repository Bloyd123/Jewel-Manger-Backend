// FILE: src/api/customer/customer.routes.js
// Customer Routes - WITH PERMISSION CHECKS

import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  searchCustomer,
  updateCustomer,
  deleteCustomer,
  blacklistCustomer,
  removeBlacklist,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getCustomerAnalytics,
} from './customer.controller.js';

import {
  createCustomerValidation,
  updateCustomerValidation,
  customerIdValidation,
  shopIdValidation,
  searchCustomerValidation,
  getCustomersValidation,
  blacklistCustomerValidation,
  loyaltyPointsValidation,
} from './customer.validation.js';

import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
} from '../middlewares/checkShopAccess.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// MIDDLEWARE: All routes require authentication

router.use(authenticate);

// CUSTOMER ANALYTICS

/**
 * @route   GET /api/v1/shops/:shopId/customers/analytics
 * @desc    Get customer analytics and summary
 * @access  Private (Shop Admin, Manager, Accountant)
 * @permission canViewCustomers OR canViewAnalytics
 */
router.get(
  '/analytics',
  shopIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkPermission('canViewCustomerAnalytics'),
  rateLimiter({ max: 30, windowMs: 60000 }),
  getCustomerAnalytics
);

// CUSTOMER SEARCH

/**
 * @route   GET /api/v1/shops/:shopId/customers/search
 * @desc    Search customer by phone/email/code
 * @access  Private (All staff can search for POS)
 * @permission canViewCustomers
 */
router.get(
  '/search',
  searchCustomerValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewCustomers'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  searchCustomer
);

// CUSTOMER CRUD OPERATIONS

/**
 * @route   POST /api/v1/shops/:shopId/customers
 * @desc    Create a new customer
 * @access  Private (Shop Admin, Manager, Staff)
 * @permission canCreateCustomers OR canManageCustomers
 */
router.post(
  '/',
  shopIdValidation,
  createCustomerValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canCreateCustomer', 'canManageCustomers']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  createCustomer
);

/**
 * @route   GET /api/v1/shops/:shopId/customers
 * @desc    Get all customers with filters and pagination
 * @access  Private (All staff)
 * @permission canViewCustomers
 */
router.get(
  '/',
  getCustomersValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewCustomers'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getCustomers
);

/**
 * @route   GET /api/v1/shops/:shopId/customers/:customerId
 * @desc    Get single customer by ID with full details
 * @access  Private (All staff)
 * @permission canViewCustomers
 */
router.get(
  '/:customerId',
  shopIdValidation,
  customerIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),

  checkShopAccess,
  checkPermission('canViewCustomers'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getCustomerById
);

/**
 * @route   PUT /api/v1/shops/:shopId/customers/:customerId
 * @desc    Update customer details
 * @access  Private (Shop Admin, Manager only)
 * @permission canEditCustomers OR canManageCustomers
 */
router.put(
  '/:customerId',
  shopIdValidation,
  updateCustomerValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canEditCustomers', 'canManageCustomers']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  updateCustomer
);

/**
 * @route   DELETE /api/v1/shops/:shopId/customers/:customerId
 * @desc    Delete customer (soft delete)
 * @access  Private (Shop Admin only)
 * @permission canDeleteCustomers AND canManageCustomers
 */
router.delete(
  '/:customerId',
  shopIdValidation,
  customerIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkAllPermissions(['canDeleteCustomers', 'canManageCustomers']),
  rateLimiter({ max: 20, windowMs: 60000 }),
  deleteCustomer
);

// CUSTOMER BLACKLIST OPERATIONS

/**
 * @route   PATCH /api/v1/shops/:shopId/customers/:customerId/blacklist
 * @desc    Blacklist a customer (security feature)
 * @access  Private (Shop Admin, Manager only)
 * @permission canManageCustomers
 */
router.patch(
  '/:customerId/blacklist',
  shopIdValidation,
  blacklistCustomerValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canBlacklistCustomer'),
  rateLimiter({ max: 10, windowMs: 60000 }),
  blacklistCustomer
);

/**
 * @route   PATCH /api/v1/shops/:shopId/customers/:customerId/unblacklist
 * @desc    Remove blacklist from customer
 * @access  Private (Shop Admin, Manager) //   UPDATED
 * @permission canManageCustomers
 */
router.patch(
  '/:customerId/unblacklist',
  shopIdValidation,
  customerIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'), //   ADDED 'manager'
  checkShopAccess,
  checkPermission('canRemoveCustomerBlacklist'),
  rateLimiter({ max: 10, windowMs: 60000 }),
  removeBlacklist
);

// LOYALTY POINTS OPERATIONS

/**
 * @route   POST /api/v1/shops/:shopId/customers/:customerId/loyalty/add
 * @desc    Add loyalty points to customer
 * @access  Private (Shop Admin, Manager)
 * @permission canManageCustomers
 */
router.post(
  '/:customerId/loyalty/add',
  shopIdValidation,
  loyaltyPointsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canAddLoyaltyPoints'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  addLoyaltyPoints
);

/**
 * @route   POST /api/v1/shops/:shopId/customers/:customerId/loyalty/redeem
 * @desc    Redeem loyalty points (usually during sale)
 * @access  Private (Shop Admin, Manager, Staff)
 * @permission canCreateSales OR canManageCustomers
 */
router.post(
  '/:customerId/loyalty/redeem',
  shopIdValidation,
  loyaltyPointsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission('canRedeemLoyaltyPoints'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  redeemLoyaltyPoints
);

// ROUTE EXPORTS

export default router;
