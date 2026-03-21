import express from 'express';
import authController from './auth.controller.js';
import authValidation from './auth.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { checkRegistrationPermission } from '../middlewares/checkRegistrationPermission.js';
import { allowOnlyIfNoSuperAdmin } from '../middlewares/allowOnlyIfNoSuperAdmin.js';

const router = express.Router();

router.post(
  '/register/super-admin',
  rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  authValidation.registerValidation,
  allowOnlyIfNoSuperAdmin,
  authController.register
);

router.post(
  '/register',
  authenticate,
  rateLimiter({ max: 100, windowMs: 15 * 60 * 1000 }),
  authValidation.registerValidation,
  checkRegistrationPermission,
  authController.register
);

router.post(
  '/login',
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }), // 10 requests per 15 minutes
  authValidation.loginValidation,
  authController.login
);

router.post(
  '/refresh-token',
  rateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes
  authValidation.refreshTokenValidation,
  authController.refreshToken
);
router.post(
  '/forgot-password',
  rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  authValidation.forgotPasswordValidation,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }), // 5 requests per hour
  authValidation.resetPasswordValidation,
  authController.resetPassword
);

router.post(
  '/verify-email',
  rateLimiter({ max: 10, windowMs: 60 * 60 * 1000 }), // 10 requests per hour
  authValidation.verifyEmailValidation,
  authController.verifyEmail
);

router.get('/me', authenticate, authController.getCurrentUser);


router.put(
  '/profile',
  authenticate,
  authValidation.updateProfileValidation,
  authController.updateProfile
);

router.post('/logout', authenticate, authController.logout);

router.post('/logout-all', authenticate, authController.logoutAllDevices);


router.post(
  '/change-password',
  authenticate,
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }), // 5 requests per hour
  authValidation.changePasswordValidation,
  authController.changePassword
);

router.post(
  '/resend-verification',
  authenticate,
  rateLimiter({ max: 3, windowMs: 60 * 60 * 1000 }), // 3 requests per hour
  authController.resendVerificationEmail
);


router.get('/sessions', authenticate, authController.getActiveSessions);


router.delete(
  '/sessions/:tokenId',
  authenticate,
  authValidation.revokeSessionValidation,
  authController.revokeSession
);


router.post('/2fa/enable', authenticate, authController.enable2FA);

router.post(
  '/2fa/verify',

  authenticate,
  authController.verify2FA
);

router.post(
  '/2fa/disable',
  authenticate,
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }),
  authController.disable2FA
);

router.post(
  '/login/2fa',
  rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 }),
  authController.verify2FALogin
);

router.post(
  '/login/backup-code',
  rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }),
  authController.verifyBackupCode
);
router.get(
  '/activity-logs',
  authenticate,
  rateLimiter({ max: 30, windowMs: 15 * 60 * 1000 }),
  authController.getActivityLogs
)
export default router;
