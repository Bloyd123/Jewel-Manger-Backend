import crypto from 'crypto';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import tokenManager from '../../utils/tokenManager.js';
import eventLogger from '../../utils/eventLogger.js';
import cache from '../../utils/cache.js';
import { sendEmail } from '../../utils/email.js';
import mongoose from 'mongoose';
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

const getDefaultPermissionsForShopAccess = (role) => {
  return getPermissionsByRole(role);
};

const sendVerificationEmail = async (user, verificationToken) => {
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
};

const sendPasswordResetEmail = async (user, resetToken) => {
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
};


export const registerUser = async (userData, ipAddress, userAgent, currentUser = null) => {
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

  if (role !== 'super_admin') {
    if (!organizationId) {
      throw new ValidationError('Organization ID is required for non-super admin users');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.isActive) {
      throw new OrganizationNotFoundError('Organization not found or inactive');
    }

    if (role === 'org_admin' && currentUser?.role !== 'super_admin') {
      throw new ValidationError('Only super admin can create org admins');
    }
  }

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

  if (primaryShop) {
    const defaultPermissions = getDefaultPermissionsForShopAccess(role);
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

  const verificationToken = tokenManager.generateEmailVerificationToken(user._id, user.email);

  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  sendVerificationEmail(user, verificationToken).catch(err => {
    console.error('Email sending failed:', err);
  });

  const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

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

  await eventLogger.logAuth(user._id, user.organizationId, 'register', 'success', ipAddress, {
    email: user.email,
    role: user.role,
  });

  cache.set(cache.userKey(user._id), user.toJSON(), 600);

  return {
    user: user.toJSON(),
    ...tokens,
  };
};

export const loginUser = async (email, password, ipAddress, userAgent) => {
  
  const user = await User.findByCredentials(email, password);

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
  if (user.twoFactorEnabled) {
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

  if (user.role !== 'super_admin') {
    const organization = await Organization.findById(user.organizationId);
    if (!organization || !organization.isActive) {
      throw new UnauthorizedError('Organization is inactive');
    }

    if (!organization.isSubscriptionActive()) {
      throw new UnauthorizedError('Organization subscription has expired');
    }
  }

  const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);
  let shopAccesses = [];
  let effectivePermissions = null;

  await user.updateLastLogin(ipAddress);

  await eventLogger.logAuth(user._id, user.organizationId, 'login', 'success', ipAddress, {
    browser: userAgent,
  });
  console.log('USER ROLE:', user.role);
console.log(' All roles check:', {
  isShopLevel: ['shop_admin', 'manager', 'staff', 'accountant', 'viewer'].includes(user.role),
  isSuperAdmin: user.role === 'super_admin',
  isOrgAdmin: user.role === 'org_admin'
});
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
  else if (user.role === 'super_admin') {
    effectivePermissions = getAllPermissions();
  }
else if (user.role === 'org_admin') {
    effectivePermissions = getOrgAdminPermissions();
    
    const Shop = mongoose.model('JewelryShop');
    const orgShops = await Shop.find({
      organizationId: user.organizationId,
      isActive: true,
      deletedAt: null,
    })
      .select('_id name displayName')
      .lean();
    
    shopAccesses = orgShops.map(shop => ({
      shopId: {
        _id: shop._id,
        name: shop.name,
        displayName: shop.displayName || shop.name,
      },
      role: 'org_admin',
      permissions: null,
      isActive: true,
    }));
    
    console.log(` Org admin ${user.email} has access to ${shopAccesses.length} shops`);
  }

  cache.set(cache.userKey(user._id), user.toJSON(), 600);

  return {
    user: user.toJSON(),
    ...tokens,
    shopAccesses, 
    effectivePermissions, 
  };
};

export const logoutUser = async (userId, organizationId, refreshToken, accessToken, ipAddress) => {
  if (refreshToken) {
    try {
      await tokenManager.revokeRefreshToken(refreshToken);
    } catch (error) {
      console.error('Refresh token revocation failed:', error);
    }
  }
  if (accessToken) {
    try {
      await tokenManager.blacklistAccessToken(accessToken);
    } catch (error) {
      console.error('Access token blacklisting failed:', error);
    }
  }

  cache.del(cache.userKey(userId));

  await eventLogger.logAuth(userId, organizationId, 'logout', 'success', ipAddress);

  return { success: true };
};

export const logoutAllDevices = async (userId, organizationId, ipAddress) => {
  const revokedCount = await tokenManager.revokeAllUserTokens(userId);

  cache.deletePattern(`user:${userId}:*`);
  cache.del(cache.userKey(userId));

  await eventLogger.logAuth(userId, organizationId, 'logout_all_devices', 'success', ipAddress, {
    revokedTokens: revokedCount,
  });

  return { revokedCount };
};

export const refreshAccessToken = async (refreshToken, ipAddress, userAgent) => {
  const tokens = await tokenManager.refreshAccessToken(refreshToken, ipAddress, userAgent);
  return tokens;
};

export const updateUserProfile = async (userId, updates) => {
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

  cache.del(cache.userKey(user._id));

  await eventLogger.logUserManagement(
    userId,
    user.organizationId,
    'profile_update',
    user._id,
    'User updated their profile',
    { updates: Object.keys(filteredUpdates) }
  );

  return user.toJSON();
};

export const changePassword = async (userId, currentPassword, newPassword, ipAddress) => {
  if (newPassword.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new UserNotFoundError();
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new InvalidCredentialsError('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  await tokenManager.revokeAllUserTokens(user._id);

  cache.del(cache.userKey(user._id));

  await eventLogger.logAuth(
    user._id,
    user.organizationId,
    'password_change',
    'success',
    ipAddress
  );

  return { success: true };
};

export const forgotPassword = async (email, ipAddress) => {
  const user = await User.findOne({ email, isActive: true });

  if (!user) {
    return { success: true };
  }

  const resetToken = tokenManager.generatePasswordResetToken(user._id);

  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    throw new InternalServerError('Failed to send password reset email');
  }

  await eventLogger.logAuth(
    user._id,
    user.organizationId,
    'password_reset_requested',
    'success',
    ipAddress,
    { email: user.email }
  );

  return { success: true };
};

export const resetPassword = async (token, newPassword, ipAddress) => {
  if (newPassword.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const decoded = tokenManager.verifySpecialToken(token, 'password_reset');

  const user = await User.findById(decoded.userId).select('+password');

  if (!user || !user.isActive) {
    throw new ValidationError('Invalid or expired reset token');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await tokenManager.revokeAllUserTokens(user._id);

  cache.del(cache.userKey(user._id));

  await eventLogger.logAuth(
    user._id,
    user.organizationId,
    'password_reset',
    'success',
    ipAddress
  );

  return { success: true };
};

export const verifyEmail = async (token, ipAddress) => {
  const decoded = tokenManager.verifySpecialToken(token, 'email_verification');

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.isEmailVerified) {
    return { alreadyVerified: true };
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  cache.del(cache.userKey(user._id));

  await eventLogger.logAuth(
    user._id,
    user.organizationId,
    'email_verified',
    'success',
    ipAddress
  );

  return { success: true };
};

export const resendVerificationEmail = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.isEmailVerified) {
    throw new ValidationError('Email is already verified');
  }

  const verificationToken = tokenManager.generateEmailVerificationToken(user._id, user.email);

  user.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  await sendVerificationEmail(user, verificationToken);

  return { success: true };
};

export const getActiveSessions = async (userId, currentTokenId) => {
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
};

export const revokeSession = async (userId, organizationId, tokenId, ipAddress) => {
  await tokenManager.revokeRefreshToken(tokenId);

  await eventLogger.logAuth(userId, organizationId, 'session_revoked', 'success', ipAddress, {
    tokenId,
  });

  return { success: true };
};

export const enable2FA = async (userId) => {
  const speakeasy = (await import('speakeasy')).default;
  const QRCode = (await import('qrcode')).default;

  const user = await User.findById(userId);
  if (!user) throw new UserNotFoundError();

  const secret = speakeasy.generateSecret({
    name: `JewelryERP (${user.email})`,
    length: 32,
  });

  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

  user.twoFactorSecret = secret.base32;
  user.twoFactorEnabled = false;
  await user.save();

  return {
    secret: secret.base32,
    qrCodeDataURL,
  };
};

export const verify2FA = async (userId, token) => {
  const speakeasy = (await import('speakeasy')).default;
  const bcrypt = (await import('bcryptjs')).default;

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new UserNotFoundError();

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) {
    throw new ValidationError('Invalid verification code');
  }

  const backupCodes = [];
  const hashedBackupCodes = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    backupCodes.push(formatted);
    hashedBackupCodes.push(await bcrypt.hash(formatted, 10));
  }

  user.twoFactorEnabled = true;
  user.backupCodes = hashedBackupCodes;
  user.backupCodesUsed = [];
  await user.save();

  await eventLogger.logAuth(userId, user.organizationId, '2fa_enabled', 'success', null);

  return { success: true, backupCodes };
};

export const disable2FA = async (userId, password, token, ipAddress) => {
  const speakeasy = (await import('speakeasy')).default;

  const user = await User.findById(userId).select('+password +twoFactorSecret');
  if (!user) throw new UserNotFoundError();

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new InvalidCredentialsError('Incorrect password');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) throw new ValidationError('Invalid 2FA code');

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.backupCodes = undefined;
  user.backupCodesUsed = undefined;
  await user.save();

  await eventLogger.logAuth(userId, user.organizationId, '2fa_disabled', 'success', ipAddress);

  return { success: true };
};

export const verify2FALogin = async (tempToken, token, ipAddress, userAgent) => {
  const speakeasy = (await import('speakeasy')).default;

  const decoded = tokenManager.verifyTempSessionToken(tempToken);

  const user = await User.findById(decoded.userId).select('+twoFactorSecret');
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid session');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) throw new ValidationError('Invalid 2FA code');

  const tokens = await tokenManager.generateTokenPair(user, ipAddress, userAgent);

  await user.updateLastLogin(ipAddress);
  await eventLogger.logAuth(
    user._id,
    user.organizationId,
    'login_2fa_success',
    'success',
    ipAddress
  );

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
  }  else if (user.role === 'org_admin') {
    effectivePermissions = getOrgAdminPermissions();
    
    const Shop = mongoose.model('JewelryShop');
    const orgShops = await Shop.find({
      organizationId: user.organizationId,
      isActive: true,
      deletedAt: null,
    })
      .select('_id name displayName')
      .lean();
    
    shopAccesses = orgShops.map(shop => ({
      shopId: {
        _id: shop._id,
        name: shop.name,
        displayName: shop.displayName || shop.name,
      },
      role: 'org_admin',
      permissions: null,
      isActive: true,
    }));
    
    console.log(` Org admin ${user.email} has access to ${shopAccesses.length} shops`);
  }


  cache.set(cache.userKey(user._id), user.toJSON(), 600);

  return {
    user: user.toJSON(),
    ...tokens,
    shopAccesses,
    effectivePermissions,
  };
};

export const verifyBackupCode = async (tempToken, backupCode, ipAddress, userAgent) => {
  const bcrypt = (await import('bcryptjs')).default;

  const decoded = tokenManager.verifyTempSessionToken(tempToken);

  const user = await User.findById(decoded.userId).select('+backupCodes +backupCodesUsed');
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid session');

  let codeFound = false;
  let codeIndex = -1;

  for (let i = 0; i < user.backupCodes.length; i++) {
    const isMatch = await bcrypt.compare(backupCode, user.backupCodes[i]);
    if (isMatch) {
      if (user.backupCodesUsed.includes(user.backupCodes[i])) {
        throw new ValidationError('This backup code has already been used');
      }
      codeFound = true;
      codeIndex = i;
      break;
    }
  }

  if (!codeFound) throw new ValidationError('Invalid backup code');

  user.backupCodesUsed.push(user.backupCodes[codeIndex]);
  await user.save();

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
  
  const Shop = mongoose.model('JewelryShop');
  const orgShops = await Shop.find({
    organizationId: user.organizationId,
    isActive: true,
    deletedAt: null,
  })
    .select('_id name displayName')
    .lean();
  
  shopAccesses = orgShops.map(shop => ({
    shopId: {
      _id: shop._id,
      name: shop.name,
      displayName: shop.displayName || shop.name,
    },
    role: 'org_admin',
    permissions: null,
    isActive: true,
  }));
  
  console.log(` Org admin ${user.email} has access to ${shopAccesses.length} shops`);
}
  cache.set(cache.userKey(user._id), user.toJSON(), 600);

  return {
    user: user.toJSON(),
    ...tokens,
    remainingBackupCodes: remainingCodes,
    shopAccesses,
    effectivePermissions,
  };
};