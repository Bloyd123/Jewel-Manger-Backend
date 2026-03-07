// FILE: middlewares/auth.js

import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import cache from '../../utils/cache.js';
import { sendUnauthorized, sendForbidden } from '../../utils/sendResponse.js';


export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return sendUnauthorized(res, 'Token has been revoked');
    }

    let user = await cache.get(cache.userKey(decoded.userId));

    if (!user) {
      user = await User.findById(decoded.userId).lean();

      if (!user) {
        return sendUnauthorized(res, 'User not found');
      }

      cache.set(cache.userKey(user._id), user, 600);
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Your account has been deactivated');
    }

    let organization = null;
    if (user.role !== 'super_admin') {
      organization = await Organization.findById(user.organizationId);
      if (!organization || !organization.isActive) {
        return sendUnauthorized(res, 'Organization is inactive');
      }

      if (!organization.isSubscriptionActive() && !organization.isTrialActive()) {
        return sendUnauthorized(res, 'Organization subscription has expired');
      }
    }

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
    next();
  }
};

export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.user.isEmailVerified) {
    return sendForbidden(res, 'Please verify your email address to access this feature');
  }

  next();
};

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
  optionalAuth,
  requireEmailVerification,
  requireFeature,
  isOrganizationOwner,
};
