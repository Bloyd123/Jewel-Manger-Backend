// ============================================================================
// FILE: middlewares/auth.js
// Authentication Middleware
// ============================================================================

import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import cache from '../../utils/cache.js';
import { sendUnauthorized, sendForbidden } from '../../utils/sendResponse.js';

/**
 * Authenticate User Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check if token is blacklisted (in case of logout)
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return sendUnauthorized(res, 'Token has been revoked');
    }

    // Try to get user from cache first
    let user = await cache.get(cache.userKey(decoded.userId));

    // If not in cache, fetch from database
    if (!user) {
      user = await User.findById(decoded.userId).lean();

      if (!user) {
        return sendUnauthorized(res, 'User not found');
      }

      // Cache the user
      cache.set(cache.userKey(user._id), user, 600);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendUnauthorized(res, 'Your account has been deactivated');
    }

// Check organization status (skip for super_admin)
let organization = null;
if (user.role !== 'super_admin') {
  organization = await Organization.findById(user.organizationId);
  if (!organization || !organization.isActive) {
    return sendUnauthorized(res, 'Organization is inactive');
  }

  // Check subscription
  if (!organization.isSubscriptionActive() && !organization.isTrialActive()) {
    return sendUnauthorized(res, 'Organization subscription has expired');
  }
}

    // Attach user and token info to request
    req.user = user;
    req.token = decoded.tokenId;
    req.organization = organization;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendUnauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Token expired');
    }
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Authorize by Role
 * Checks if user has required role
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendForbidden(res, 'You do not have permission to perform this action');
    }

    next();
  };
};

/**
 * Check Shop Access
 * Verifies user has access to a specific shop
 */
export const checkShopAccess = (shopIdParam = 'shopId') => {
  return async (req, res, next) => {
    try {
      const shopId = req.params[shopIdParam] || req.body.shopId || req.query.shopId;

      if (!shopId) {
        return sendForbidden(res, 'Shop ID is required');
      }

      // Super admin and org admin have access to all shops
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }

      // Check if user has access to this shop
      const hasAccess = req.user.shopAccess?.some(
        access => access.shopId.toString() === shopId.toString()
      );

      if (!hasAccess) {
        return sendForbidden(res, 'You do not have access to this shop');
      }

      // Attach shop ID to request
      req.shopId = shopId;

      next();
    } catch (error) {
      return sendForbidden(res, 'Shop access verification failed');
    }
  };
};

/**
 * Check Specific Permission
 * Verifies user has a specific permission for a shop
 */
export const checkPermission = (permission, shopIdParam = 'shopId') => {
  return async (req, res, next) => {
    try {
      const shopId = req.params[shopIdParam] || req.body.shopId || req.query.shopId;

      if (!shopId) {
        return sendForbidden(res, 'Shop ID is required');
      }

      // Super admin has all permissions
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Get shop access
      const shopAccess = req.user.shopAccess?.find(
        access => access.shopId.toString() === shopId.toString()
      );

      if (!shopAccess) {
        return sendForbidden(res, 'You do not have access to this shop');
      }

      // Check specific permission
      if (!shopAccess.permissions[permission]) {
        return sendForbidden(res, `You do not have ${permission} permission for this shop`);
      }

      // Attach shop ID to request
      req.shopId = shopId;

      next();
    } catch (error) {
      return sendForbidden(res, 'Permission verification failed');
    }
  };
};

/**
 * Optional Authentication
 * Authenticates if token is present, but doesn't fail if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId).lean();

    if (user && user.isActive) {
      req.user = user;
      req.token = decoded.tokenId;
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

/**
 * Verify Email Required
 * Checks if user's email is verified
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.user.isEmailVerified) {
    return sendForbidden(res, 'Please verify your email address to access this feature');
  }

  next();
};

/**
 * Check Organization Feature
 * Verifies if organization has access to a specific feature
 */
export const requireFeature = featureName => {
  return async (req, res, next) => {
    if (!req.organization) {
      return sendForbidden(res, 'Organization information not found');
    }

    if (!req.organization.subscription.features[featureName]) {
      return sendForbidden(
        res,
        `This feature is not available in your current plan. Please upgrade to access ${featureName}.`
      );
    }

    next();
  };
};

/**
 * Check if user is organization owner
 */
export const isOrganizationOwner = (req, res, next) => {
  if (!req.user || !req.organization) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (req.user._id.toString() !== req.organization.ownerId.toString()) {
    return sendForbidden(res, 'Only organization owner can perform this action');
  }

  next();
};

export default {
  authenticate,
  authorize,
  checkShopAccess,
  checkPermission,
  optionalAuth,
  requireEmailVerification,
  requireFeature,
  isOrganizationOwner,
};
