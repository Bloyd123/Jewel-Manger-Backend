// FILE: src/api/organization/organization.service.js

import mongoose from 'mongoose';
import Organization from '../../models/Organization.js';
import JewelryShop from '../../models/Shop.js';
import User from '../../models/User.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import ActivityLog from '../../models/ActivityLog.js';
import cache from '../../utils/cache.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '../../utils/AppError.js';
import { getPermissionsByRole } from '../../config/permissions.config.js';
import {
  sendVerificationEmail,
} from '../../utils/email.js';
import tokenManager from '../../utils/tokenManager.js';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────
// CREATE ORGANIZATION
// ─────────────────────────────────────────────
export const createOrganization = async (orgData, userId) => {
  // Slug generate karo
  const slug = await Organization.generateSlug(orgData.name);

  // Check duplicate email
  const existingEmail = await Organization.findOne({ email: orgData.email }).setOptions({
    includeDeleted: true,
  });
  if (existingEmail) {
    throw new ConflictError(`Organization with email "${orgData.email}" already exists`);
  }

  // Check duplicate GST
  if (orgData.gstNumber) {
    const existingGST = await Organization.findOne({ gstNumber: orgData.gstNumber }).setOptions({
      includeDeleted: true,
    });
    if (existingGST) {
      throw new ConflictError(`Organization with GST "${orgData.gstNumber}" already exists`);
    }
  }

  const organization = await Organization.create({
    ...orgData,
    slug,
    ownerId: userId,
    createdBy: userId,
    isActive: true,
    isVerified: false,
    subscription: {
      plan: orgData.subscription?.plan || 'free',
      status: orgData.subscription?.status || 'trial',
      trialEndsAt:
        orgData.subscription?.trialEndsAt ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      maxShops: orgData.subscription?.maxShops || 1,
      maxUsers: orgData.subscription?.maxUsers || 5,
      maxProducts: orgData.subscription?.maxProducts || 1000,
      ...orgData.subscription,
    },
  });

  await ActivityLog.create({
    userId,
    organizationId: organization._id,
    action: 'create',
    module: 'organization',
    description: `Organization "${organization.name}" created`,
    level: 'info',
    status: 'success',
    metadata: {
      organizationId: organization._id,
      slug: organization.slug,
      plan: organization.subscription.plan,
    },
  });

  cache.set(`org:${organization._id}`, organization.toJSON(), 600);

  return organization;
};

// ─────────────────────────────────────────────
// GET ALL ORGANIZATIONS (super_admin only)
// ─────────────────────────────────────────────
export const getAllOrganizations = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search,
    isActive,
    isVerified,
    plan,
    status,
    sort = '-createdAt',
  } = queryParams;

  const query = { deletedAt: null };

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { slug: new RegExp(search, 'i') },
      { 'address.city': new RegExp(search, 'i') },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (isVerified !== undefined) {
    query.isVerified = isVerified === 'true';
  }

  if (plan) {
    query['subscription.plan'] = plan;
  }

  if (status) {
    query['subscription.status'] = status;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [organizations, totalDocs] = await Promise.all([
    Organization.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('ownerId', 'firstName lastName email phone')
      .lean(),
    Organization.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalDocs / limitNum);

  return {
    data: organizations,
    pagination: {
      totalDocs,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
    },
  };
};

// ─────────────────────────────────────────────
// GET ORGANIZATION BY ID
// ─────────────────────────────────────────────
export const getOrganizationById = async (orgId, userId, userRole) => {
  const cacheKey = `org:${orgId}`;
  let org = cache.get(cacheKey);

  if (!org) {
    org = await Organization.findById(orgId)
      .populate('ownerId', 'firstName lastName email phone profileImage')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    cache.set(cacheKey, org, 600);
  }

  // Access check — org_admin sirf apna dekh sakta hai
  if (userRole === 'org_admin' && org._id.toString() !== orgId.toString()) {
    throw new UnauthorizedError('You do not have access to this organization');
  }

  return org;
};

// ─────────────────────────────────────────────
// UPDATE ORGANIZATION
// ─────────────────────────────────────────────
export const updateOrganization = async (orgId, updateData, userId, userRole) => {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  // Org admin sirf apna update kar sakta hai
  if (userRole === 'org_admin' && org._id.toString() !== orgId.toString()) {
    throw new UnauthorizedError('You can only update your own organization');
  }

  // Protected fields
  const protectedFields = ['slug', 'ownerId', 'createdBy', 'createdAt', 'usage', 'subscription'];
  protectedFields.forEach((field) => delete updateData[field]);

  // Super admin hi subscription change kar sakta hai
  if (userRole !== 'super_admin') {
    delete updateData.isVerified;
    delete updateData.verifiedAt;
    delete updateData.verifiedBy;
  }

  Object.assign(org, updateData);
  org.updatedBy = userId;
  await org.save();

  cache.del(`org:${orgId}`);

  await ActivityLog.create({
    userId,
    organizationId: orgId,
    action: 'update',
    module: 'organization',
    description: `Organization "${org.name}" updated`,
    level: 'info',
    status: 'success',
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return org;
};

// ─────────────────────────────────────────────
// DELETE ORGANIZATION (soft delete)
// ─────────────────────────────────────────────
export const deleteOrganization = async (orgId, userId) => {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  // Check karo koi active shops toh nahi
  const activeShops = await JewelryShop.countDocuments({
    organizationId: orgId,
    deletedAt: null,
    isActive: true,
  });

  if (activeShops > 0) {
    throw new ValidationError(
      `Cannot delete organization with ${activeShops} active shop(s). Please delete all shops first.`
    );
  }

  await org.softDelete();

  cache.del(`org:${orgId}`);

  await ActivityLog.create({
    userId,
    organizationId: orgId,
    action: 'delete',
    module: 'organization',
    description: `Organization "${org.name}" deleted`,
    level: 'warn',
    status: 'success',
  });

  return { success: true, message: 'Organization deleted successfully' };
};

// ─────────────────────────────────────────────
// GET ORGANIZATION SHOPS
// ─────────────────────────────────────────────
export const getOrganizationShops = async (orgId, queryParams, userId, userRole) => {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  const { page = 1, limit = 10, isActive, sort = '-createdAt' } = queryParams;

  const query = { organizationId: orgId, deletedAt: null };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 };

  const [shops, totalDocs] = await Promise.all([
    JewelryShop.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('managerId', 'firstName lastName email phone')
      .lean(),
    JewelryShop.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalDocs / limitNum);

  return {
    data: shops,
    pagination: {
      totalDocs,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// ─────────────────────────────────────────────
// GET ORGANIZATION STATS
// ─────────────────────────────────────────────
export const getOrganizationStats = async (orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  await org.updateUsage();

  const [totalShops, activeShops, totalUsers, activeUsers] = await Promise.all([
    JewelryShop.countDocuments({ organizationId: orgId, deletedAt: null }),
    JewelryShop.countDocuments({ organizationId: orgId, deletedAt: null, isActive: true }),
    User.countDocuments({ organizationId: orgId, deletedAt: null }),
    User.countDocuments({ organizationId: orgId, deletedAt: null, isActive: true }),
  ]);

  return {
    organization: {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      isVerified: org.isVerified,
    },
    subscription: {
      plan: org.subscription.plan,
      status: org.subscription.status,
      trialEndsAt: org.subscription.trialEndsAt,
      endDate: org.subscription.endDate,
      daysRemaining: org.subscriptionDaysRemaining,
      trialDaysRemaining: org.trialDaysRemaining,
      limits: {
        maxShops: org.subscription.maxShops,
        maxUsers: org.subscription.maxUsers,
        maxProducts: org.subscription.maxProducts,
      },
    },
    usage: {
      totalShops,
      activeShops,
      totalUsers,
      activeUsers,
      storageUsed: org.usage.storageUsed,
    },
  };
};

// ─────────────────────────────────────────────
// UPDATE SUBSCRIPTION (super_admin only)
// ─────────────────────────────────────────────
export const updateSubscription = async (orgId, subscriptionData, userId) => {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  Object.assign(org.subscription, subscriptionData);
  org.updatedBy = userId;
  await org.save();

  cache.del(`org:${orgId}`);

  await ActivityLog.create({
    userId,
    organizationId: orgId,
    action: 'update_subscription',
    module: 'organization',
    description: `Subscription updated for "${org.name}" — Plan: ${org.subscription.plan}`,
    level: 'info',
    status: 'success',
    metadata: subscriptionData,
  });

  return org;
};

// ─────────────────────────────────────────────
// ONBOARD SOLO JEWELLER
// One request mein: Org + Shop + User sab ban jaye
// ─────────────────────────────────────────────
export const onboardSoloJeweller = async (onboardData, createdByUserId, ipAddress, userAgent) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organization, shop, user, freeForMonths = 12 } = onboardData;

    // ── Step 1: Check duplicate email (org + user dono) ──
    const [existingOrgEmail, existingUserEmail, existingUsername] = await Promise.all([
      Organization.findOne({ email: organization.email }).setOptions({ includeDeleted: true }),
      User.findOne({ email: user.email }).setOptions({ includeDeleted: true }),
      User.findOne({ username: user.username }).setOptions({ includeDeleted: true }),
    ]);

    if (existingOrgEmail) {
      throw new ConflictError(`Organization email "${organization.email}" already exists`);
    }
    if (existingUserEmail) {
      throw new ConflictError(`User email "${user.email}" already exists`);
    }
    if (existingUsername) {
      throw new ConflictError(`Username "${user.username}" already taken`);
    }

    // ── Step 2: PEHLE User banana ──
    // organizationId null rakhte hain — Step 4 mein set hoga
    // role temporarily 'super_admin' rakho taaki organizationId required bypass ho
    // Step 4 mein sahi role 'shop_admin' set kar denge
    const [newUser] = await User.create(
      [
        {
          username: user.username,
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName || '',
          phone: user.phone,
          organizationId: null,
          role: 'super_admin',
          isActive: true,
          createdBy: createdByUserId,
        },
      ],
      { session }
    );

    // ── Step 3: Ab Organization banana (ownerId available hai) ──
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + freeForMonths);

    const slug = await Organization.generateSlug(organization.name);

    const [newOrg] = await Organization.create(
      [
        {
          ...organization,
          slug,
          ownerId: newUser._id, // ← ab available hai
          isActive: true,
          isVerified: false,
          createdBy: createdByUserId,
          subscription: {
            plan: 'free',
            status: 'trial',
            trialEndsAt,
            maxShops: 1,
            maxUsers: 5,
            maxProducts: 1000,
            features: {
              inventoryManagement: true,
              purchaseManagement: true,
              salesManagement: true,
              billingInvoicing: true,
              partyManagement: true,
              employeeManagement: false,
              multiShop: false,
              advancedReports: false,
              analyticsReports: false,
              emailNotifications: true,
              dataBackup: true,
            },
          },
        },
      ],
      { session }
    );

    // ── Step 4: User ka organizationId aur role update karo ──
    newUser.organizationId = newOrg._id;
    newUser.role = 'shop_admin'; // ab sahi role set karo
    await newUser.save({ session });

    // ── Step 5: Shop banana ──
    const shopCode = await JewelryShop.generateCode(shop.name, newOrg._id);

    const [newShop] = await JewelryShop.create(
      [
        {
          ...shop,
          organizationId: newOrg._id,
          managerId: newUser._id,
          code: shopCode,
          isActive: true,
          createdBy: createdByUserId,
          openingDate: new Date(),
        },
      ],
      { session }
    );

    // ── Step 6: User ka primaryShop set karo ──
    newUser.primaryShop = newShop._id;
    await newUser.save({ session });

    // ── Step 7: UserShopAccess banana ──
    await UserShopAccess.create(
      [
        {
          userId: newUser._id,
          shopId: newShop._id,
          organizationId: newOrg._id,
          role: 'shop_admin',
          permissions: getPermissionsByRole('shop_admin'),
          isActive: true,
          assignedBy: createdByUserId,
        },
      ],
      { session }
    );

    // ── Step 8: Organization usage update karo ──
    newOrg.usage.totalShops = 1;
    newOrg.usage.totalUsers = 1;
    newOrg.usage.lastUpdated = new Date();
    await newOrg.save({ session });

    // ── Step 9: Email verification token ──
    const verificationToken = tokenManager.generateEmailVerificationToken(
      newUser._id,
      newUser.email
    );
    newUser.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    newUser.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await newUser.save({ session });

    // ── Step 10: Activity log ──
    await ActivityLog.create(
      [
        {
          userId: createdByUserId,
          organizationId: newOrg._id,
          shopId: newShop._id,
          action: 'onboard',
          module: 'organization',
          description: `Solo jeweller onboarded: "${newOrg.name}"`,
          level: 'info',
          status: 'success',
          metadata: {
            organizationId: newOrg._id,
            shopId: newShop._id,
            userId: newUser._id,
            plan: 'free',
            trialMonths: freeForMonths,
            trialEndsAt,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // ── Email send karo (transaction ke bahar) ──
    sendVerificationEmail(newUser, verificationToken).catch((err) => {
      logger.error('Verification email failed during onboarding:', err);
    });

    // ── Tokens generate karo ──
    const tokens = await tokenManager.generateTokenPair(newUser, ipAddress, userAgent);

    logger.info(`Solo jeweller onboarded: ${newOrg.name} | User: ${newUser.email}`);

    return {
      organization: {
        _id: newOrg._id,
        name: newOrg.name,
        slug: newOrg.slug,
        subscription: {
          plan: newOrg.subscription.plan,
          status: newOrg.subscription.status,
          trialEndsAt: newOrg.subscription.trialEndsAt,
          freeForMonths,
        },
      },
      shop: {
        _id: newShop._id,
        name: newShop.name,
        code: newShop.code,
      },
      user: newUser.toJSON(),
      ...tokens,
      message: `Welcome! Your account is set up. Free for ${freeForMonths} months.`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};