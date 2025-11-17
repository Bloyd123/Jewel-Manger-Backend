import authService from './auth.service.js';
import eventLogger from '../../utils/eventLogger.js';
import catchAsync from '../../utils/catchAsync.js';
import { sendSuccess, sendCreated } from '../../utils/sendResponse.js';
import {
  ValidationError,
  InvalidCredentialsError,
  UnauthorizedError,
  UserNotFoundError,
  TokenExpiredError,
  InvalidTokenError,
} from '../../utils/AppError.js';

// ========================================
// 1. REGISTER NEW USER
// ========================================
export const register = catchAsync(async (req, res) => {
  const { username, email, password, firstName, lastName, organizationId, role, primaryShop } =
    req.body;

  // Validate required fields
  if (!username || !email || !password || !firstName) {
    throw new ValidationError('Please provide all required fields');
  }
  // ============================================
  // NEW: Extra Super Admin Safety Check
  // ============================================
  if (role === 'super_admin') {
    if (organizationId || primaryShop) {
      throw new ValidationError('Super admin cannot have organization or shop assignments');
    }
  }
  // Role-based validation (express-validator already handles this, but double-check)
  if (role === 'super_admin' && (organizationId || primaryShop)) {
    throw new ValidationError('Super admin cannot have organization or shop assignments');
  }

  if (role === 'org_admin' && !organizationId) {
    throw new ValidationError('Organization ID is required for org admin');
  }

  if (['shop_admin', 'manager', 'staff', 'accountant', 'viewer'].includes(role) && !primaryShop) {
    throw new ValidationError('Primary shop is required for shop-level users');
  }

  // Pass currentUser (req.user) to service - will be null for public registration
  const result = await authService.registerUser(
    req.body,
    req.ip,
    req.headers['user-agent'],
    req.user || null
  );

  return sendCreated(res, 'Registration successful. Please verify your email.', result);
});

// ========================================
// 2. LOGIN USER
// ========================================
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError('Please provide email and password');
  }

  try {
    const result = await authService.loginUser(email, password, req.ip, req.headers['user-agent']);

    return sendSuccess(res, 200, 'Login successful', result);
  } catch (error) {
    // Log failed login attempt
    await eventLogger.logAuth(null, null, 'login_failed', 'failed', req.ip, {
      email,
      reason: error.message,
    });

    // Throw proper error for middleware to handle
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new InvalidCredentialsError();
  }
});

// ========================================
// 3. LOGOUT USER
// ========================================
export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  // Extract access token from Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.split(' ')[1] || null;

  await authService.logoutUser(
    req.user._id,
    req.user.organizationId,
    refreshToken,
    accessToken, //   Pass access token
    req.ip
  );

  return sendSuccess(res, 200, 'Logout successful');
});

// ========================================
// 4. LOGOUT FROM ALL DEVICES
// ========================================
export const logoutAllDevices = catchAsync(async (req, res) => {
  const { revokedCount } = await authService.logoutAllDevices(
    req.user._id,
    req.user.organizationId,
    req.ip
  );

  return sendSuccess(res, 200, `Successfully logged out from ${revokedCount} device(s)`);
});

// ========================================
// 5. REFRESH ACCESS TOKEN
// ========================================
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  const tokens = await authService.refreshAccessToken(
    refreshToken,
    req.ip,
    req.headers['user-agent']
  );

  return sendSuccess(res, 200, 'Token refreshed successfully', tokens);
});

// ========================================
// 6. GET CURRENT USER
// ========================================
export const getCurrentUser = catchAsync(async (req, res) => {
  // User is already attached by authenticate middleware
  return sendSuccess(res, 200, 'User retrieved successfully', req.user);
});

// ========================================
// 7. UPDATE CURRENT USER PROFILE
// ========================================
export const updateProfile = catchAsync(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user._id, req.body);

  return sendSuccess(res, 200, 'Profile updated successfully', updatedUser);
});

// ========================================
// 8. CHANGE PASSWORD
// ========================================
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ValidationError('Please provide all required fields');
  }

  if (newPassword !== confirmPassword) {
    throw new ValidationError('New passwords do not match');
  }

  await authService.changePassword(req.user._id, currentPassword, newPassword, req.ip);

  return sendSuccess(res, 200, 'Password changed successfully. Please login again.');
});

// ========================================
// 9. FORGOT PASSWORD (Send Reset Link)
// ========================================
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Please provide email address');
  }

  await authService.forgotPassword(email, req.ip);

  return sendSuccess(res, 200, 'If the email exists, a password reset link has been sent');
});

// ========================================
// 10. RESET PASSWORD
// ========================================
export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    throw new ValidationError('Please provide all required fields');
  }

  if (newPassword !== confirmPassword) {
    throw new ValidationError('Passwords do not match');
  }

  try {
    await authService.resetPassword(token, newPassword, req.ip);

    return sendSuccess(res, 200, 'Password reset successful. Please login.');
  } catch (error) {
    if (error.message === 'Token expired') {
      throw new TokenExpiredError('Reset token has expired');
    }
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new InvalidTokenError('Invalid or expired reset token');
  }
});

// ========================================
// 11. VERIFY EMAIL
// ========================================
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token is required');
  }

  try {
    const result = await authService.verifyEmail(token, req.ip);

    if (result.alreadyVerified) {
      return sendSuccess(res, 200, 'Email is already verified');
    }

    return sendSuccess(res, 200, 'Email verified successfully');
  } catch (error) {
    if (error.message === 'Token expired') {
      throw new TokenExpiredError('Verification token has expired');
    }
    if (error instanceof UserNotFoundError) {
      throw error;
    }
    throw new InvalidTokenError('Invalid or expired verification token');
  }
});

// ========================================
// 12. RESEND VERIFICATION EMAIL
// ========================================
export const resendVerificationEmail = catchAsync(async (req, res) => {
  await authService.resendVerificationEmail(req.user._id);

  return sendSuccess(res, 200, 'Verification email sent successfully');
});

// ========================================
// 13. GET ACTIVE SESSIONS
// ========================================
export const getActiveSessions = catchAsync(async (req, res) => {
  const sessions = await authService.getActiveSessions(req.user._id, req.token);

  return sendSuccess(res, 200, 'Active sessions retrieved successfully', sessions);
});

// ========================================
// 14. REVOKE SESSION
// ========================================
export const revokeSession = catchAsync(async (req, res) => {
  const { tokenId } = req.params;

  if (!tokenId) {
    throw new ValidationError('Token ID is required');
  }

  await authService.revokeSession(req.user._id, req.user.organizationId, tokenId, req.ip);

  return sendSuccess(res, 200, 'Session revoked successfully');
});

export default {
  register,
  login,
  logout,
  logoutAllDevices,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getActiveSessions,
  revokeSession,
};
