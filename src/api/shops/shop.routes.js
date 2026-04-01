// FILE: src/api/shops/shop.routes.js

import express from 'express';
import * as shopController from './shop.controller.js';
import * as shopValidation from './shop.validation.js';
import { authenticate } from '../middlewares/auth.js';
import {
  checkShopAccess,
  checkPermission,
  verifyShopOwnership,
} from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { PERMISSIONS } from '../../config/permission.constants.js';
const router = express.Router();


router.use(authenticate);


router.post(
  '/',
  shopValidation.createShopValidation,
  restrictTo('super_admin', 'org_admin'),
  checkPermission(PERMISSIONS.CREATE_SHOP),
  shopController.createShop
);

router.get(
  '/',
  shopValidation.getShopsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkPermission(PERMISSIONS.VIEW_SHOPS),
  shopController.getAllShops
);

router.get(
  '/:id',
  shopValidation.getShopValidation,
  checkShopAccess, 
  checkPermission(PERMISSIONS.VIEW_SINGLE_SHOP),
  shopController.getShopById
);
router.put(
  '/:id',
  shopValidation.updateShopValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.UPDATE_SHOP), 
  shopController.updateShop
);

router.delete(
  '/:id',
  shopValidation.deleteShopValidation,
  restrictTo('super_admin', 'org_admin'),
  checkShopAccess, 
  checkPermission(PERMISSIONS.DELETE_SHOP),
  shopController.deleteShop
);

router.patch(
  '/:id/settings',
  shopValidation.updateShopSettingsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SHOP_SETTINGS), 
  shopController.updateShopSettings
);

router.get(
  '/:id/statistics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess, 
  checkPermission(PERMISSIONS.VIEW_SHOP_STATISTICS),
  shopController.getShopStatistics
);
router.get(
  '/:id/activity-logs',
  shopValidation.getActivityLogsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_AUDIT_LOG),
  shopController.getShopActivityLogs
);

// router.post(
//   '/:id/transfer-inventory',
//   shopValidation.transferInventoryValidation,
//   restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
//   checkShopAccess,
//   checkPermission('canTransferInventory'),  //   New permission
//   shopController.transferInventory
// );

// EXPORT ROUTER

export default router;
