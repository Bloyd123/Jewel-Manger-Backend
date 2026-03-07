// FILE: middleware/checkRegistrationPermission.js

import JewelryShop from '../../models/Shop.js';
import Organization from '../../models/Organization.js';


export const checkRegistrationPermission = async (req, res, next) => {
  const { role, organizationId, primaryShop } = req.body;
  const currentUser = req.user; // Logged-in user who is registering


  if (role !== 'super_admin' && organizationId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (!organization.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Organization is inactive',
      });
    }
  }


  if (currentUser.role === 'super_admin') {

    return next();
  }


  if (currentUser.role === 'org_admin') {
    if (organizationId !== currentUser.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own organization',
      });
    }

    const allowedRoles = ['shop_admin', 'manager', 'staff', 'accountant', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Org admin can only create shop-level users',
      });
    }

    if (primaryShop) {
      const shop = await JewelryShop.findOne({
        _id: primaryShop,
        organizationId: currentUser.organizationId,
      });

      if (!shop) {
        return res.status(400).json({
          success: false,
          message: 'Shop not found or does not belong to your organization',
        });
      }
    }

    return next();
  }


  if (currentUser.role === 'shop_admin') {
    if (organizationId !== currentUser.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your organization',
      });
    }

    if (primaryShop !== currentUser.primaryShop?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own shop',
      });
    }

    const allowedRoles = ['manager', 'staff', 'accountant', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Shop admin can only create manager, staff, accountant, and user roles',
      });
    }

    return next();
  }


  if (currentUser.role === 'manager') {
    if (primaryShop !== currentUser.primaryShop?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own shop',
      });
    }

    const allowedRoles = ['staff', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Manager can only create staff and user roles',
      });
    }

    return next();
  }


  return res.status(403).json({
    success: false,
    message: 'You do not have permission to create users',
  });
};

export default checkRegistrationPermission;
