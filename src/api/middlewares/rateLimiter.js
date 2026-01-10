// FILE: middlewares/rateLimiter.js
// Rate Limiting Middleware

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../../config/redis.js';

import { sendTooManyRequests } from '../../utils/sendResponse.js';

/**
 * Custom Rate Limiter Factory
 * Creates rate limiter with custom options
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
    skip = null,
  } = options;

  const limiterOptions = {
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: null,
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    skipFailedRequests,

    // Custom key generator (by IP or user ID)
    keyGenerator:
      keyGenerator ||
      (req => {
        return req.user ? `user:${req.user._id}` : ipKeyGenerator(req);
      }),

    // Custom skip function
    skip: skip || (() => false),

    // Custom handler when rate limit is exceeded
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', retryAfter);
      return sendTooManyRequests(res, message, { retryAfter });
    },
  };

  // Use Redis store if Redis is available
  if (redis && redis.status === 'ready') {
    limiterOptions.store = new RedisStore({
      client: redis,
      prefix: 'rl:', // rate limit prefix
    });
  }

  return rateLimit(limiterOptions);
};

/**
 * Strict Rate Limiter for Authentication Routes
 * Very strict limits for login, register, password reset
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Login Rate Limiter
 * Stricter limits for login attempts
 */
export const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: false,
  keyGenerator: req => {
    const ip = ipKeyGenerator(req);
    return req.body.email ? `login:${ip}:${req.body.email}` : `login:${ip}`;
  },
});

/**
 * Password Reset Rate Limiter
 * Very strict for password reset requests
 */
export const passwordResetRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again later',
  keyGenerator: req => {
    return req.body.email ? `pwd-reset:${req.body.email}` : `pwd-reset:${ipKeyGenerator(req)}`;
  },
});

/**
 * API Rate Limiter
 * General API rate limiting
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many API requests, please slow down',
  keyGenerator: req => {
    const ip = ipKeyGenerator(req);
    return req.user ? `api:user:${req.user._id}` : `api:ip:${ip}`;
  },
});

/**
 * File Upload Rate Limiter
 * Limit file uploads
 */
export const uploadRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later',
  keyGenerator: req => {
    return req.user ? `upload:${req.user._id}` : `upload:${ipKeyGenerator(req)}`;
  },
});

/**
 * Email/SMS Send Rate Limiter
 * Limit notification sending
 */
export const notificationRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many notification requests, please try again later',
  keyGenerator: req => {
    return req.user ? `notification:${req.user._id}` : `notification:${ipKeyGenerator(req)}`;
  },
});

/**
 * Search Rate Limiter
 * Limit expensive search operations
 */
export const searchRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many search requests, please slow down',
  skipSuccessfulRequests: false,
});

/**
 * Report Generation Rate Limiter
 * Limit report generation (expensive operation)
 */
export const reportRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many report generation requests, please try again later',
  keyGenerator: req => {
    return req.user ? `report:${req.user._id}` : `report:${ipKeyGenerator(req)}`;
  },
});

/**
 * Create/Update Rate Limiter
 * Limit create and update operations
 */
export const createUpdateRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many create/update requests, please slow down',
  keyGenerator: req => {
    return req.user ? `crud:${req.user._id}` : `crud:${ipKeyGenerator(req)}`;
  },
});

/**
 * Delete Rate Limiter
 * Stricter limits for delete operations
 */
export const deleteRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many delete requests, please slow down',
  keyGenerator: req => {
    return req.user ? `delete:${req.user._id}` : `delete:${ipKeyGenerator(req)}`;
  },
});

/**
 * IP-based Rate Limiter
 * Strictly by IP address
 */
export const ipRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  keyGenerator: req => ipKeyGenerator(req),
});

/**
 * Global Rate Limiter
 * Applied to all routes as baseline protection
 */
export const globalRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please slow down',
});

/**
 * Flexible Rate Limiter by Plan
 * Adjusts limits based on subscription plan
 */
export const planBasedRateLimiter = (baseMax = 100) => {
  return rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: async req => {
      if (!req.user || !req.organization) {
        return baseMax;
      }

      // Adjust rate limit based on subscription plan
      const planMultipliers = {
        free: 1,
        basic: 2,
        standard: 3,
        premium: 5,
        enterprise: 10,
      };

      const plan = req.organization.subscription.plan;
      const multiplier = planMultipliers[plan] || 1;

      return baseMax * multiplier;
    },
    message: 'Rate limit exceeded for your plan. Consider upgrading for higher limits.',
  });
};

/**
 * Skip Rate Limiter for Specific IPs
 * Whitelist certain IPs (e.g., internal services)
 */
export const createRateLimiterWithWhitelist = (whitelist = [], options = {}) => {
  return rateLimiter({
    ...options,
    skip: req => whitelist.includes(ipKeyGenerator(req)),
  });
};

/**
 * Dynamic Rate Limiter
 * Adjusts based on request properties
 */
export const dynamicRateLimiter = getOptions => {
  return async (req, res, next) => {
    const options = await getOptions(req);
    return rateLimiter(options)(req, res, next);
  };
};

export default {
  rateLimiter,
  authRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  notificationRateLimiter,
  searchRateLimiter,
  reportRateLimiter,
  createUpdateRateLimiter,
  deleteRateLimiter,
  ipRateLimiter,
  globalRateLimiter,
  planBasedRateLimiter,
  createRateLimiterWithWhitelist,
  dynamicRateLimiter,
};
