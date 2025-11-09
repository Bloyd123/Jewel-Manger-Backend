import express from 'express';
import authController from './auth.controller.js';
import authValidation from './auth.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
// Add these imports at the top
import { checkRegistrationPermission } from '../middlewares/checkRegistrationPermission.js';
import { allowOnlyIfNoSuperAdmin } from '../middlewares/allowOnlyIfNoSuperAdmin.js';

const router = express.Router();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register/super-admin',
  rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  authValidation.registerValidation,
  allowOnlyIfNoSuperAdmin,
  authController.register
);

// 2. Protected registration (all other users)
router.post(
  '/register',
  authenticate,
  rateLimiter({ max: 100, windowMs: 15 * 60 * 1000 }),
  authValidation.registerValidation,
  checkRegistrationPermission,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 requests per 15 minutes
  authValidation.loginValidation,
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh-token',
  rateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes
  authValidation.refreshTokenValidation,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post(
  '/forgot-password',
  rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  authValidation.forgotPasswordValidation,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post(
  '/reset-password',
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }), // 5 requests per hour
  authValidation.resetPasswordValidation,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  rateLimiter({ max: 10, windowMs: 60 * 60 * 1000 }), // 10 requests per hour
  authValidation.verifyEmailValidation,
  authController.verifyEmail
);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  authValidation.updateProfileValidation,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAllDevices);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }), // 5 requests per hour
  authValidation.changePasswordValidation,
  authController.changePassword
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private
 */
router.post(
  '/resend-verification',
  authenticate,
  rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  authController.resendVerificationEmail
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions
 * @access  Private
 */
router.get('/sessions', authenticate, authController.getActiveSessions);

/**
 * @route   DELETE /api/auth/sessions/:tokenId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete(
  '/sessions/:tokenId',
  authenticate,
  authValidation.revokeSessionValidation,
  authController.revokeSession
);

export default router;
