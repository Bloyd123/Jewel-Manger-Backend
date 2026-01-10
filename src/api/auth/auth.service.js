import crypto from 'crypto';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import tokenManager from '../../utils/tokenManager.js';
import eventLogger from '../../utils/eventLogger.js';
import cache from '../../utils/cache.js';
import { sendEmail } from '../../utils/email.js';
import {
  getPermissionsByRole,
  getAllPermissions,
  getOrgAdminPermissions,
} from '../../config/permissions.config.js';
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
  // USER REGISTRATION

  async registerUser(userData, ipAddress, userAgent, currentUser = null) {
    //   STEP 1: Destructure userData FIRST
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

    //   STEP 2: Validate organization (skip for super_admin only)
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

    //   STEP 3: Check GLOBAL uniqueness
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
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

    //   STEP 4: Create User
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

    //   STEP 5: Create UserShopAccess (if shop-level user)
    if (primaryShop) {
      const defaultPermissions = this.getDefaultPermissionsForShopAccess(role);
      await UserShopAccess.create({
        userId: user._id,
        shopId: primaryShop,
        organizationId,
        role,
        permissions: defaultPermissions,
        isActive: true,
        grantedBy: currentUser?._id || null,
      });
      console.log('  UserShopAccess created for', user.email, 'with role', role);
    }

    //   STEP 6: Generate email verification token
    const verificationToken = tokenManager.generateEmailVerificationToken(user._id, user.email);

    // Save verification token (hashed)
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    //   STEP 7: Send verification email (non-blocking)
    this.sendVerificationEmail(user, verificationToken).catch(err => {
      console.error('Email sending failed:', err);
    });

    //   STEP 8: Generate token pair
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

    //   STEP 9: Log Activity
    //   STEP 9: Log Activity
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

  // HELPER: Default Permissions Based on Role

  getDefaultPermissionsForShopAccess(role) {
    return getPermissionsByRole(role);
  }

  // USER LOGIN

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

    // Check if organization is active (skip for super_admin)
    if (user.role !== 'super_admin') {
      const organization = await Organization.findById(user.organizationId);
      if (!organization || !organization.isActive) {
        throw new UnauthorizedError('Organization is inactive');
      }
      if (user.twoFactorEnabled) {
        // Generate temporary session token (5 min expiry)
        const tempToken = tokenManager.generateTempSessionToken(user._id);

        await eventLogger.logAuth(
          user._id,
          user.organizationId,
          'login_2fa_required',
          'success',
          ipAddress
        );

        return {
          requires2FA: true,
          tempToken,
        };
      }
      // !important
      // // Check subscription status
      // if (!organization.isSubscriptionActive()) {
      //   throw new UnauthorizedError('Organization subscription has expired');
      // }
    }

    // Check subscription status
    // if (!organization.isSubscriptionActive()) {
    //   throw new UnauthorizedError('Organization subscription has expired');
    // }

    // Generate token pair
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);
    // NEW: Role-based permission handling
    let shopAccesses = [];
    let effectivePermissions = null;

    // Update last login
    await user.updateLastLogin(ipAddress);

    // Log successful login
    await eventLogger.logAuth(user._id, user.organizationId, 'login', 'success', ipAddress, {
      browser: userAgent,
    });
    // For shop-level users: Fetch from database
    if (['shop_admin', 'manager', 'staff', 'accountant', 'viewer'].includes(user.role)) {
      shopAccesses = await UserShopAccess.find({
        userId: user._id,
        isActive: true,
        deletedAt: null,
        revokedAt: null,
      })
        .select('shopId role permissions isActive')
        .populate('shopId', 'name displayName');
    }
    // For super admin: All permissions
    else if (user.role === 'super_admin') {
      effectivePermissions = getAllPermissions();
    }
    // For org admin: Organization-level permissions
    else if (user.role === 'org_admin') {
      effectivePermissions = getOrgAdminPermissions();
    }

    // Cache user
    cache.set(cache.userKey(user._id), user.toJSON(), 600);

    return {
      user: user.toJSON(),
      ...tokens,
      shopAccesses, // Always array (empty or with data)
      effectivePermissions, // null or permissions object
    };
  }

  // USER LOGOUT

  async logoutUser(userId, organizationId, refreshToken, accessToken, ipAddress) {
    if (refreshToken) {
      try {
        await tokenManager.revokeRefreshToken(refreshToken);
      } catch (error) {
        console.error('Refresh token revocation failed:', error);
      }
    }
    // 2.   Blacklist access token
    if (accessToken) {
      try {
        await tokenManager.blacklistAccessToken(accessToken);
      } catch (error) {
        console.error('Access token blacklisting failed:', error);
      }
    }

    // Clear user cache
    cache.del(cache.userKey(userId));

    // Log logout
    await eventLogger.logAuth(userId, organizationId, 'logout', 'success', ipAddress);

    return { success: true };
  }

  // LOGOUT FROM ALL DEVICES

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

  // REFRESH ACCESS TOKEN

  async refreshAccessToken(refreshToken, ipAddress, userAgent) {
    const tokens = await tokenManager.refreshAccessToken(refreshToken, ipAddress, userAgent);
    return tokens;
  }

  // UPDATE USER PROFILE

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

  // CHANGE PASSWORD

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

  // FORGOT PASSWORD

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

  // RESET PASSWORD

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

  // VERIFY EMAIL

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

  // RESEND VERIFICATION EMAIL

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

  // GET ACTIVE SESSIONS

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

  // REVOKE SESSION

  async revokeSession(userId, organizationId, tokenId, ipAddress) {
    await tokenManager.revokeRefreshToken(tokenId);

    // Log activity
    await eventLogger.logAuth(userId, organizationId, 'session_revoked', 'success', ipAddress, {
      tokenId,
    });

    return { success: true };
  }

  // EMAIL HELPERS

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

  // ENABLE 2FA

  async enable2FA(userId) {
    const speakeasy = (await import('speakeasy')).default;
    const QRCode = (await import('qrcode')).default;

    const user = await User.findById(userId);
    if (!user) throw new UserNotFoundError();

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `JewelryERP (${user.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    return {
      secret: secret.base32,
      qrCodeDataURL,
    };
  }

  // VERIFY & ACTIVATE 2FA

  async verify2FA(userId, token) {
    const speakeasy = (await import('speakeasy')).default;
    const bcrypt = (await import('bcryptjs')).default;

    const user = await User.findById(userId).select('+twoFactorSecret');
    if (!user) throw new UserNotFoundError();

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      throw new ValidationError('Invalid verification code');
    }

    // Generate 10 backup codes
    const backupCodes = [];
    const hashedBackupCodes = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      backupCodes.push(formatted);
      hashedBackupCodes.push(await bcrypt.hash(formatted, 10));
    }

    // Save and enable 2FA
    user.twoFactorEnabled = true;
    user.backupCodes = hashedBackupCodes;
    user.backupCodesUsed = [];
    await user.save();

    await eventLogger.logAuth(userId, user.organizationId, '2fa_enabled', 'success', null);

    return { success: true, backupCodes };
  }

  // DISABLE 2FA

  async disable2FA(userId, password, token, ipAddress) {
    const speakeasy = (await import('speakeasy')).default;

    const user = await User.findById(userId).select('+password +twoFactorSecret');
    if (!user) throw new UserNotFoundError();

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new InvalidCredentialsError('Incorrect password');

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) throw new ValidationError('Invalid 2FA code');

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = undefined;
    user.backupCodesUsed = undefined;
    await user.save();

    await eventLogger.logAuth(userId, user.organizationId, '2fa_disabled', 'success', ipAddress);

    return { success: true };
  }

  // VERIFY 2FA DURING LOGIN

  async verify2FALogin(tempToken, token, ipAddress, userAgent) {
    const speakeasy = (await import('speakeasy')).default;

    // Verify temp token
    const decoded = tokenManager.verifyTempSessionToken(tempToken);

    const user = await User.findById(decoded.userId).select('+twoFactorSecret');
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid session');

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) throw new ValidationError('Invalid 2FA code');

    // Generate real tokens
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

    await user.updateLastLogin(ipAddress);
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'login_2fa_success',
      'success',
      ipAddress
    );

    // Get shop accesses and permissions (same as login)
    let shopAccesses = [];
    let effectivePermissions = null;

    if (['shop_admin', 'manager', 'staff', 'accountant', 'viewer'].includes(user.role)) {
      const UserShopAccess = mongoose.model('UserShopAccess');
      shopAccesses = await UserShopAccess.find({
        userId: user._id,
        isActive: true,
        deletedAt: null,
        revokedAt: null,
      })
        .select('shopId role permissions isActive')
        .populate('shopId', 'name displayName');
    } else if (user.role === 'super_admin') {
      effectivePermissions = getAllPermissions();
    } else if (user.role === 'org_admin') {
      effectivePermissions = getOrgAdminPermissions();
    }

    cache.set(cache.userKey(user._id), user.toJSON(), 600);

    return {
      user: user.toJSON(),
      ...tokens,
      shopAccesses,
      effectivePermissions,
    };
  }

  // VERIFY BACKUP CODE DURING LOGIN

  async verifyBackupCode(tempToken, backupCode, ipAddress, userAgent) {
    const bcrypt = (await import('bcryptjs')).default;

    const decoded = tokenManager.verifyTempSessionToken(tempToken);

    const user = await User.findById(decoded.userId).select('+backupCodes +backupCodesUsed');
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid session');

    // Check backup codes
    let codeFound = false;
    let codeIndex = -1;

    for (let i = 0; i < user.backupCodes.length; i++) {
      const isMatch = await bcrypt.compare(backupCode, user.backupCodes[i]);
      if (isMatch) {
        // Check if already used
        if (user.backupCodesUsed.includes(user.backupCodes[i])) {
          throw new ValidationError('This backup code has already been used');
        }
        codeFound = true;
        codeIndex = i;
        break;
      }
    }

    if (!codeFound) throw new ValidationError('Invalid backup code');

    // Mark as used
    user.backupCodesUsed.push(user.backupCodes[codeIndex]);
    await user.save();

    // Generate tokens
    const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

    await user.updateLastLogin(ipAddress);
    await eventLogger.logAuth(
      user._id,
      user.organizationId,
      'backup_code_used',
      'success',
      ipAddress
    );

    const remainingCodes = user.backupCodes.length - user.backupCodesUsed.length;

    // Get shop accesses and permissions (same as login)
    let shopAccesses = [];
    let effectivePermissions = null;

    if (['shop_admin', 'manager', 'staff', 'accountant', 'viewer'].includes(user.role)) {
      const UserShopAccess = mongoose.model('UserShopAccess');
      shopAccesses = await UserShopAccess.find({
        userId: user._id,
        isActive: true,
        deletedAt: null,
        revokedAt: null,
      })
        .select('shopId role permissions isActive')
        .populate('shopId', 'name displayName');
    } else if (user.role === 'super_admin') {
      effectivePermissions = getAllPermissions();
    } else if (user.role === 'org_admin') {
      effectivePermissions = getOrgAdminPermissions();
    }

    cache.set(cache.userKey(user._id), user.toJSON(), 600);

    return {
      user: user.toJSON(),
      ...tokens,
      remainingBackupCodes: remainingCodes,
      shopAccesses,
      effectivePermissions,
    };
  }
}

export default new AuthService();
