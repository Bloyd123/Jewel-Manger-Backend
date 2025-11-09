import crypto from 'crypto';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import tokenManager from '../../utils/tokenManager.js';
import eventLogger from '../../utils/eventLogger.js';
import cache from '../../utils/cache.js';
import { sendEmail } from '../../utils/email.js';
import {
  OrganizationNotFoundError,
  DuplicateEmailError,
  DuplicateUsernameError,
  UnauthorizedError,
  UserNotFoundError,
  InvalidCredentialsError,
  ValidationError,
  InternalServerError,
} from '../../utils/AppError.js';

/**
 * Authentication Service
 * Handles all business logic for authentication operations
 */
class AuthService {
  // ========================================
  // USER REGISTRATION
  // ========================================
  async registerUser(userData, ipAddress, userAgent, currentUser = null) {
    // ✅ STEP 1: Destructure userData FIRST
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      organizationId,
      role = 'user',
      primaryShop,
      department,
    } = userData;

// ✅ STEP 2: Validate organization (skip for super_admin only)
if (role !== 'super_admin') {
  if (!organizationId) {
    throw new ValidationError('Organization ID is required for non-super admin users');
  }
  
  const organization = await Organization.findById(organizationId);
  if (!organization || !organization.isActive) {
    throw new OrganizationNotFoundError('Organization not found or inactive');
  }
  
  // For org_admin, verify they're being created by super_admin
  if (role === 'org_admin' && currentUser?.role !== 'super_admin') {
    throw new ValidationError('Only super admin can create org admins');
  }
}

// ✅ STEP 3: Check GLOBAL uniqueness
const existingUser = await User.findOne({
  $or: [{ email }, { username }]
});

if (existingUser) {
  if (existingUser.email === email) {
    throw new DuplicateEmailError(
      `Email "${email}" is already registered. Please use a different email.`
    );
  }
  throw new DuplicateUsernameError(
    `Username "${username}" is already taken. Please choose a different username.`
  );
}

    // ✅ STEP 4: Create User
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      organizationId: role === 'super_admin' ? null : organizationId,
      role,
      primaryShop: primaryShop || null,
      department,
      createdBy: currentUser?._id || null,
      isActive: true,
    });

    // ✅ STEP 5: Create UserShopAccess (if shop-level user)
    if (primaryShop) {
      await UserShopAccess.create({
        userId: user._id,
        shopId: primaryShop,
        organizationId,
        role: role === 'shop_admin' ? 'admin' : role === 'manager' ? 'manager' : 'staff',
        permissions: this.getDefaultPermissions(role),
        isActive: true,
        grantedBy: currentUser?._id || null,
      });
    }

    // ✅ STEP 6: Generate email verification token
    const verificationToken = tokenManager.generateEmailVerificationToken(user._id, user.email);

    // Save verification token (hashed)
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // ✅ STEP 7: Send verification email (non-blocking)
    this.sendVerificationEmail(user, verificationToken).catch(err => {
      console.error('Email sending failed:', err);
    });

    // ✅ STEP 8: Generate token pair
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

    // ✅ STEP 9: Log Activity
// ✅ STEP 9: Log Activity
if (currentUser) {
  await eventLogger.logUserManagement(
    currentUser._id,
    organizationId || null,
    'user_created',
    user._id,
    `Created new user: ${user.username} with role: ${role}`,
    { role, organizationId, primaryShop, createdBy: currentUser._id }
  );
}

    // Log registration
    await eventLogger.logAuth(user._id, user.organizationId, 'register', 'success', ipAddress, {
      email: user.email,
      role: user.role,
    });

    // Cache user
    cache.set(cache.userKey(user._id), user.toJSON(), 600);

    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  // ============================================
  // HELPER: Default Permissions Based on Role
  // ============================================
  getDefaultPermissions(role) {
    switch (role) {
      case 'shop_admin':
        return {
          inventory: { view: true, create: true, edit: true, delete: true },
          sales: { view: true, create: true, edit: true, delete: true },
          purchase: { view: true, create: true, edit: true, delete: true },
          parties: { view: true, create: true, edit: true, delete: true },
          reports: { view: true, create: true, edit: true, delete: true },
          settings: { view: true, create: true, edit: true, delete: false },
          users: { view: true, create: true, edit: true, delete: false },
        };

      case 'manager':
        return {
          inventory: { view: true, create: true, edit: true, delete: false },
          sales: { view: true, create: true, edit: true, delete: false },
          purchase: { view: true, create: true, edit: false, delete: false },
          parties: { view: true, create: true, edit: true, delete: false },
          reports: { view: true, create: false, edit: false, delete: false },
          settings: { view: true, create: false, edit: false, delete: false },
          users: { view: true, create: false, edit: false, delete: false },
        };

      case 'staff':
        return {
          inventory: { view: true, create: false, edit: false, delete: false },
          sales: { view: true, create: true, edit: false, delete: false },
          purchase: { view: false, create: false, edit: false, delete: false },
          parties: { view: true, create: false, edit: false, delete: false },
          reports: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
        };

      case 'accountant':
        return {
          inventory: { view: true, create: false, edit: false, delete: false },
          sales: { view: true, create: false, edit: true, delete: false },
          purchase: { view: true, create: false, edit: true, delete: false },
          parties: { view: true, create: true, edit: true, delete: false },
          reports: { view: true, create: true, edit: false, delete: false },
          settings: { view: true, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
        };

      default: // 'user' role
        return {
          inventory: { view: true, create: false, edit: false, delete: false },
          sales: { view: true, create: false, edit: false, delete: false },
          purchase: { view: false, create: false, edit: false, delete: false },
          parties: { view: true, create: false, edit: false, delete: false },
          reports: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
        };
    }
  }

  // ========================================
  // USER LOGIN
  // ========================================
  async loginUser(email, password, ipAddress, userAgent) {
    // Find user by credentials
    const user = await User.findByCredentials(email, password);

    // Check if user is active
    if (!user.isActive) {
      await eventLogger.logAuth(
        user._id,
        user.organizationId,
        'login_failed',
        'failed',
        ipAddress,
        { email, reason: 'Account deactivated' }
      );
      throw new UnauthorizedError('Your account has been deactivated');
    }

    // Check if organization is active
    const organization = await Organization.findById(user.organizationId);
    if (!organization || !organization.isActive) {
      throw new UnauthorizedError('Organization is inactive');
    }

    // Check subscription status
    if (!organization.isSubscriptionActive()) {
      throw new UnauthorizedError('Organization subscription has expired');
    }

    // Generate token pair
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

    // Update last login
    await user.updateLastLogin(ipAddress);

    // Log successful login
    await eventLogger.logAuth(user._id, user.organizationId, 'login', 'success', ipAddress, {
      browser: userAgent,
    });

    // Cache user
    cache.set(cache.userKey(user._id), user.toJSON(), 600);

    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  // ========================================
  // USER LOGOUT
  // ========================================
  async logoutUser(userId, organizationId, refreshToken, ipAddress) {
    if (refreshToken) {
      try {
        await tokenManager.revokeRefreshToken(refreshToken);
      } catch (error) {
        console.error('Token revocation failed:', error);
      }
    }

    // Clear user cache
    cache.del(cache.userKey(userId));

    // Log logout
    await eventLogger.logAuth(userId, organizationId, 'logout', 'success', ipAddress);

    return { success: true };
  }

  // ========================================
  // LOGOUT FROM ALL DEVICES
  // ========================================
  async logoutAllDevices(userId, organizationId, ipAddress) {
    const revokedCount = await tokenManager.revokeAllUserTokens(userId);

    // Clear all user-related cache
    cache.deletePattern(`user:${userId}:*`);
    cache.del(cache.userKey(userId));

    // Log activity
    await eventLogger.logAuth(userId, organizationId, 'logout_all_devices', 'success', ipAddress, {
      revokedTokens: revokedCount,
    });

    return { revokedCount };
  }

  // ========================================
  // REFRESH ACCESS TOKEN
  // ========================================
  async refreshAccessToken(refreshToken, ipAddress, userAgent) {
    const tokens = await tokenManager.refreshAccessToken(refreshToken, ipAddress, userAgent);
    return tokens;
  }

  // ========================================
  // UPDATE USER PROFILE
  // ========================================
  async updateUserProfile(userId, updates) {
    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'profileImage',
      'designation',
      'preferences',
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...filteredUpdates, updatedBy: userId },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new UserNotFoundError();
    }

    // Invalidate cache
    cache.del(cache.userKey(user._id));

    // Log activity
    await eventLogger.logUserManagement(
      userId,
      user.organizationId,
      'profile_update',
      user._id,
      'User updated their profile',
      { updates: Object.keys(filteredUpdates) }
    );

    return user.toJSON();
  }

  // ========================================
  // CHANGE PASSWORD
  // ========================================
  async changePassword(userId, currentPassword, newPassword, ipAddress) {
    // Validate password length
    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new UserNotFoundError();
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all tokens (force re-login)
    await tokenManager.revokeAllUserTokens(user._id);

    // Clear cache
    cache.del(cache.userKey(user._id));

    // Log activity
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'password_change',
      'success',
      ipAddress
    );

    return { success: true };
  }

  // ========================================
  // FORGOT PASSWORD
  // ========================================
  async forgotPassword(email, ipAddress) {
    const user = await User.findOne({ email, isActive: true });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return { success: true };
    }

    // Generate reset token
    const resetToken = tokenManager.generatePasswordResetToken(user._id);

    // Save hashed token to user
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send email
    try {
      await this.sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      // Cleanup token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new InternalServerError('Failed to send password reset email');
    }

    // Log activity
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'password_reset_requested',
      'success',
      ipAddress,
      { email: user.email }
    );

    return { success: true };
  }

  // ========================================
  // RESET PASSWORD
  // ========================================
  async resetPassword(token, newPassword, ipAddress) {
    // Validate password length
    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Verify token
    const decoded = tokenManager.verifySpecialToken(token, 'password_reset');

    // Find user
    const user = await User.findById(decoded.userId).select('+password');

    if (!user || !user.isActive) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all tokens
    await tokenManager.revokeAllUserTokens(user._id);

    // Clear cache
    cache.del(cache.userKey(user._id));

    // Log activity
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'password_reset',
      'success',
      ipAddress
    );

    return { success: true };
  }

  // ========================================
  // VERIFY EMAIL
  // ========================================
  async verifyEmail(token, ipAddress) {
    // Verify token
    const decoded = tokenManager.verifySpecialToken(token, 'email_verification');

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return { alreadyVerified: true };
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Clear cache
    cache.del(cache.userKey(user._id));

    // Log activity
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'email_verified',
      'success',
      ipAddress
    );

    return { success: true };
  }

  // ========================================
  // RESEND VERIFICATION EMAIL
  // ========================================
  async resendVerificationEmail(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = tokenManager.generateEmailVerificationToken(user._id, user.email);

    // Save token
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send email
    await this.sendVerificationEmail(user, verificationToken);

    return { success: true };
  }

  // ========================================
  // GET ACTIVE SESSIONS
  // ========================================
  async getActiveSessions(userId, currentTokenId) {
    const sessions = await tokenManager.getUserTokens(userId);

    const formattedSessions = sessions.map(session => ({
      id: session.tokenId,
      device: session.userAgent || 'Unknown Device',
      ipAddress: session.ipAddress,
      lastUsed: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.tokenId === currentTokenId,
    }));

    return formattedSessions;
  }

  // ========================================
  // REVOKE SESSION
  // ========================================
  async revokeSession(userId, organizationId, tokenId, ipAddress) {
    await tokenManager.revokeRefreshToken(tokenId);

    // Log activity
    await eventLogger.logAuth(userId, organizationId, 'session_revoked', 'success', ipAddress, {
      tokenId,
    });

    return { success: true };
  }

  // ========================================
  // EMAIL HELPERS
  // ========================================
  async sendVerificationEmail(user, verificationToken) {
    const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Email Verification - Jewelry ERP',
      html: `
        <h2>Welcome ${user.firstName}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyURL}" style="display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Jewelry ERP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }
}

export default new AuthService();
