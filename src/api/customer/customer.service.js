// FILE: src/api/customer/customer.service.js

import Customer from '../../models/Customer.js';
import JewelryShop from '../../models/Shop.js';
import cache from '../../utils/cache.js';
import { paginate } from '../../utils/pagination.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from '../../utils/AppError.js';
import Sale from '../../models/Sale.js'
import eventLogger from '../../utils/eventLogger.js'
import ActivityLog from '../../models/ActivityLog.js'
export const generateCustomerCode = async (shopId, prefix = 'CUST') => {
  let number = 1;
  let customerCode;
  
  do {
    customerCode = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await Customer.findOne({ 
      shopId, 
      customerCode 
    }).setOptions({ includeDeleted: true }) // deleted bhi check karo
    
    if (!existing) break;
    number++;
  } while (true);

  return customerCode;
};


export const checkDuplicatePhone = async (shopId, phone, excludeCustomerId = null) => {
  const query = {
    shopId,
    phone,
    deletedAt: null,
  };

  if (excludeCustomerId) {
    query._id = { $ne: excludeCustomerId };
  }

  const existing = await Customer.findOne(query).lean();
  return existing;
};


export const createCustomer = async (shopId, customerData, userId) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new NotFoundError('Shop not found');
  }

  const normalizedData = normalizeCustomerData(customerData);

  const duplicate = await checkDuplicatePhone(shopId, normalizedData.phone);
  if (duplicate) {
    throw new ConflictError(
      `Customer with phone ${normalizedData.phone} already exists in this shop`
    );
  }

  const customerCode = await generateCustomerCode(shopId);

  const customer = await Customer.create({
    organizationId: shop.organizationId,
    shopId,
    customerCode,
    ...normalizedData,
    isActive: true,
    membershipTier: 'standard',
    loyaltyPoints: 0,
    currentBalance: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalDue: 0,
    statistics: {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderDate: null,
      lastVisitDate: null,
      firstOrderDate: null,
    },
    createdBy: userId,
  });

  await updateShopStatistics(shopId);

  await cacheCustomer(customer);

  return customer;
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId, shopId = null) => {
  const cacheKey = `customer:${customerId}`;
  let customer = await cache.get(cacheKey);

  if (!customer) {
    const query = { _id: customerId, deletedAt: null };
    if (shopId) query.shopId = shopId;

    customer = await Customer.findOne(query)
      .populate('referredBy', 'firstName lastName customerCode phone')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    await cache.set(cacheKey, customer, 1800);
  }

  return customer;
};

export const searchCustomer = async (shopId, searchParams) => {
  const { phone, email, customerCode, search } = searchParams;

  const query = { shopId, deletedAt: null };

  if (phone) {
    const cacheKey = `customer:phone:${shopId}:${phone}`;
    const cachedId = await cache.get(cacheKey);

    if (cachedId) {
      return await getCustomerById(cachedId, shopId);
    }

    query.phone = phone;
  } else if (email) {
    query.email = email.toLowerCase();
  } else if (customerCode) {
    query.customerCode = customerCode.toUpperCase();
  } else if (search) {
    query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { phone: new RegExp(search) },
      { email: new RegExp(search, 'i') },
      { customerCode: new RegExp(search, 'i') },
    ];
  }

  const customer = await Customer.findOne(query)
    .select(
      'firstName lastName phone email customerCode customerType membershipTier loyaltyPoints totalPurchases statistics.lastOrderDate isActive'
    )
    .lean();

  if (customer && phone) {
    const cacheKey = `customer:phone:${shopId}:${phone}`;
    await cache.set(cacheKey, customer._id.toString(), 3600);
  }

  return customer;
};

/**
 * Get all customers with filters and pagination
 */
export const getCustomers = async (shopId, filters = {}, paginationOptions = {}) => {
  const query = { shopId, deletedAt: null };

  if (filters.search) {
    query.$or = [
      { firstName: new RegExp(filters.search, 'i') },
      { lastName: new RegExp(filters.search, 'i') },
      { phone: new RegExp(filters.search) },
      { email: new RegExp(filters.search, 'i') },
      { customerCode: new RegExp(filters.search, 'i') },
    ];
  }

  if (filters.customerType) {
    query.customerType = filters.customerType;
  }

  if (filters.membershipTier) {
    query.membershipTier = filters.membershipTier;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  if (filters.hasBalance) {
    query.totalDue = { $gt: 0 };
  }

  if (filters.vipOnly) {
    query.$or = [{ customerType: 'vip' }, { membershipTier: 'platinum' }];
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  const cacheKey = `customers:${shopId}:${JSON.stringify(filters)}:${JSON.stringify(paginationOptions)}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await paginate(Customer, query, {
    page: paginationOptions.page || 1,
    limit: paginationOptions.limit || 20,
    sort: paginationOptions.sort || '-createdAt',
    select:
      'firstName lastName phone email customerCode customerType membershipTier loyaltyPoints totalPurchases totalDue isActive statistics.lastOrderDate createdAt',
    populate: [{ path: 'referredBy', select: 'firstName lastName customerCode' }],
  });

  await cache.set(cacheKey, result, 300);

  return result;
};

export const updateCustomer = async (customerId, shopId, updateData, userId) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  });

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (customer.isBlacklisted) {
    throw new ValidationError('Cannot update blacklisted customer');
  }

  const normalizedData = normalizeCustomerData(updateData);

  if (normalizedData.phone && normalizedData.phone !== customer.phone) {
    const duplicate = await checkDuplicatePhone(shopId, normalizedData.phone, customerId);
    if (duplicate) {
      throw new ConflictError('Phone number already exists');
    }
  }

  const changes = {};
  Object.keys(normalizedData).forEach(key => {
    if (JSON.stringify(customer[key]) !== JSON.stringify(normalizedData[key])) {
      changes[key] = {
        old: customer[key],
        new: normalizedData[key],
      };
    }
  });

  Object.assign(customer, normalizedData);
  customer.updatedBy = userId;
  await customer.save();

  await invalidateCustomerCache(customerId, shopId, customer.phone);

  return { customer, changes };
};

/**
 * Delete customer (soft delete)
 */
export const deleteCustomer = async (customerId, shopId, userId) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  });

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (customer.totalDue > 0) {
    throw new ValidationError(
      `Cannot delete customer with outstanding balance of ₹${customer.totalDue}`
    );
  }

  await customer.softDelete();

  await invalidateCustomerCache(customerId, shopId, customer.phone);

  await updateShopStatistics(shopId);

  return customer;
};

/**
 * Blacklist customer
 */
export const blacklistCustomer = async (customerId, shopId, reason, userId) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  });

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (customer.isBlacklisted) {
    throw new ValidationError('Customer is already blacklisted');
  }

  await customer.blacklist(reason);

  await invalidateCustomerCache(customerId, shopId, customer.phone);

  return customer;
};

/**
 * Remove blacklist
 */
export const removeBlacklist = async (customerId, shopId, userId) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  });

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  if (!customer.isBlacklisted) {
    throw new ValidationError('Customer is not blacklisted');
  }

  await customer.removeBlacklist();

  await invalidateCustomerCache(customerId, shopId, customer.phone);

  return customer;
};

export const addLoyaltyPoints = async (customerId, shopId, points, reason = null) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  })

  if (!customer) throw new NotFoundError('Customer not found')

  await customer.addLoyaltyPoints(points)

await eventLogger.logCustomer(
  null,                                    // userId
  customer.organizationId,                 // organizationId
  shopId,                                  // shopId
  'add_loyalty_points',                    // action
  customer._id,                            // customerId
  `Added ${points} loyalty points`,        // description
  { points, reason }                       // metadata
)

  await invalidateCustomerCache(customerId, shopId, customer.phone)

  return customer
}

export const redeemLoyaltyPoints = async (customerId, shopId, points) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  })

  if (!customer) throw new NotFoundError('Customer not found')

  if (customer.loyaltyPoints < points) {
    throw new ValidationError('Insufficient loyalty points')
  }

  await customer.redeemLoyaltyPoints(points)

await eventLogger.logCustomer(
  null,
  customer.organizationId,
  shopId,
  'redeem_loyalty_points',
  customer._id,
  `Redeemed ${points} loyalty points`,
  { points }
)

  await invalidateCustomerCache(customerId, shopId, customer.phone)

  return customer
}

// NEW - getCustomerActivity
export const getCustomerActivity = async (customerId, options = {}) => {
  const { module, action, limit = 50 } = options

  const queryOptions = {
    limit: parseInt(limit),
    ...(module && { module }),
    ...(action && { action }),
  }

  return ActivityLog.findByUser(customerId, queryOptions)
}

// NEW - getCustomerDocuments
export const getCustomerDocuments = async (customerId, shopId) => {
  const customer = await Customer.findOne({
    _id: customerId,
    shopId,
    deletedAt: null,
  }).select('documents')

  if (!customer) throw new NotFoundError('Customer not found')

  return customer.documents
}

// NEW - getCustomerLoyaltySummary
export const getCustomerLoyaltySummary = async (customerId) => {
  const loyaltyLogs = await ActivityLog.findByUser(customerId, {
    module: 'customer',
    limit: 100,
  })

  const loyaltyTransactions = loyaltyLogs.filter(log =>
    ['add_loyalty_points', 'redeem_loyalty_points'].includes(log.action)
  )

  const totalEarned = loyaltyTransactions
    .filter(log => log.action === 'add_loyalty_points')
    .reduce((sum, log) => sum + (log.metadata?.points || 0), 0)

  const totalRedeemed = loyaltyTransactions
    .filter(log => log.action === 'redeem_loyalty_points')
    .reduce((sum, log) => sum + (log.metadata?.points || 0), 0)

  const recentActivity = loyaltyTransactions.slice(0, 10)

  return {
    totalEarned,
    totalRedeemed,
    recentActivity,
  }
}

/**
 * Get customer statistics
 */
export const getCustomerStatistics = async (shopId) => {
  const stats = await Customer.aggregate([
    { $match: { shopId, deletedAt: null } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        activeCustomers: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        vipCustomers: {
          $sum: { $cond: [{ $eq: ['$customerType', 'vip'] }, 1, 0] },
        },
        totalOutstanding: { $sum: '$totalDue' },
        totalLoyaltyPoints: { $sum: '$loyaltyPoints' },
        avgLifetimeValue: { $avg: '$totalPurchases' },
      },
    },
  ]);

  return (
    stats[0] || {
      totalCustomers: 0,
      activeCustomers: 0,
      vipCustomers: 0,
      totalOutstanding: 0,
      totalLoyaltyPoints: 0,
      avgLifetimeValue: 0,
    }
  );
};
export const getAdvancedAnalytics = async (shopId, organizationId) => {

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    basicStats,
    growthData,
    retentionData,
    retentionCount,
    totalActive,
    topCustomers,
    segmentationByTier,
    segmentationByType,
    segmentationByCategory,
    geographyData,
    purchasePatternData,
    upcomingEventsRaw,
    atRiskCustomers,
    outstandingPayments,
  ] = await Promise.all([

    // 1. Basic Stats
    getCustomerStatistics(shopId),

    // 2. Growth Data
    Customer.aggregate([
      {
        $match: {
          shopId,
          organizationId,
          deletedAt: null,
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' },
            ],
          },
          newCustomers: 1,
        },
      },
    ]),

    // 3. Retention Data (monthly)
    Customer.aggregate([
      {
        $match: {
          shopId,
          organizationId,
          deletedAt: null,
          'statistics.lastOrderDate': { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year:  '$statistics.lastOrderDate' },
            month: { $month: '$statistics.lastOrderDate' },
          },
          activeCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' },
            ],
          },
          rate: '$activeCount',
        },
      },
    ]),

    // 4. Retention Rate - count karo
    Customer.countDocuments({
      shopId,
      organizationId,
      deletedAt: null,
      isActive: true,
      'statistics.lastOrderDate': { $gte: ninetyDaysAgo },
    }),

    // 5. Total Active - retention rate ke liye
    Customer.countDocuments({
      shopId,
      organizationId,
      deletedAt: null,
      isActive: true,
    }),

    // 6. Top Customers
    Customer.find({
      shopId,
      organizationId,
      deletedAt: null,
      isActive: true,
    })
      .sort({ 'statistics.totalSpent': -1 })
      .limit(10)
      .select(
        'firstName lastName customerCode phone email totalPurchases loyaltyPoints membershipTier statistics.lastOrderDate'
      )
      .lean(),

    // 7. Segmentation by Tier
    Customer.aggregate([
      { $match: { shopId, organizationId, deletedAt: null } },
      {
        $group: {
          _id:   '$membershipTier',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id:  0,
          name: '$_id',
          value: 1,
        },
      },
    ]),

    // 8. Segmentation by Type
    Customer.aggregate([
      { $match: { shopId, organizationId, deletedAt: null } },
      {
        $group: {
          _id:   '$customerType',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id:  0,
          name: '$_id',
          value: 1,
        },
      },
    ]),

    // 9. Segmentation by Category
    Customer.aggregate([
      { $match: { shopId, organizationId, deletedAt: null } },
      {
        $group: {
          _id:   '$customerCategory',
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id:  0,
          name: '$_id',
          value: 1,
        },
      },
    ]),

    // 10. Geographic Distribution
    Customer.aggregate([
      {
        $match: {
          shopId,
          organizationId,
          deletedAt: null,
          'address.city': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id:       '$address.city',
          customers: { $sum: 1 },
          revenue:   { $sum: '$totalPurchases' },
        },
      },
      { $sort: { customers: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id:  0,
          city: '$_id',
          customers: 1,
          revenue: 1,
        },
      },
    ]),

    // 11. Purchase Pattern
    Sale.aggregate([
      {
        $match: {
          shopId,
          organizationId,
          deletedAt: null,
          status: { $ne: 'cancelled' },
          saleDate: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year:  '$saleDate' },
            month: { $month: '$saleDate' },
          },
          orders:  { $sum: 1 },
          revenue: { $sum: '$financials.grandTotal' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' },
            ],
          },
          orders: 1,
          revenue: 1,
          averageOrderValue: { $divide: ['$revenue', '$orders'] },
        },
      },
    ]),

    // 12. Upcoming Events raw data
    Customer.aggregate([
      {
        $match: {
          shopId,
          organizationId,
          deletedAt: null,
          isActive: true,
          $or: [
            { dateOfBirth:     { $exists: true, $ne: null } },
            { anniversaryDate: { $exists: true, $ne: null } },
          ],
        },
      },
      {
        $project: {
          customerCode:    1,
          customerName:    { $concat: ['$firstName', ' ', { $ifNull: ['$lastName', ''] }] },
          dateOfBirth:     1,
          anniversaryDate: 1,
        },
      },
      { $limit: 50 },
    ]),

    // 13. At-Risk Customers
    Customer.find({
      shopId,
      organizationId,
      deletedAt: null,
      isActive: true,
      'statistics.lastOrderDate': {
        $lt: ninetyDaysAgo,
        $exists: true,
      },
    })
      .sort({ 'statistics.lastOrderDate': 1 })
      .limit(10)
      .select('firstName lastName customerCode phone statistics.lastOrderDate totalPurchases')
      .lean()
      .then(customers =>
        customers.map(c => {
          const daysSinceLastOrder = Math.floor(
            (now - new Date(c.statistics.lastOrderDate)) / (1000 * 60 * 60 * 24)
          )
          return {
            _id:                c._id,
            customerCode:       c.customerCode,
            fullName:           `${c.firstName} ${c.lastName || ''}`.trim(),
            phone:              c.phone,
            lastOrderDate:      c.statistics.lastOrderDate,
            daysSinceLastOrder,
            totalPurchases:     c.totalPurchases,
            riskLevel:
              daysSinceLastOrder > 180 ? 'high'
              : daysSinceLastOrder > 90 ? 'medium'
              : 'low',
          }
        })
      ),

    // 14. Outstanding Payments
    Customer.find({
      shopId,
      organizationId,
      deletedAt: null,
      totalDue: { $gt: 0 },
    })
      .sort({ totalDue: -1 })
      .limit(10)
      .select('firstName lastName customerCode phone totalDue statistics.lastOrderDate')
      .lean()
      .then(customers =>
        customers.map(c => ({
          _id:             c._id,
          customerCode:    c.customerCode,
          fullName:        `${c.firstName} ${c.lastName || ''}`.trim(),
          phone:           c.phone,
          totalDue:        c.totalDue,
          overdueAmount:   c.totalDue,
          lastPaymentDate: c.statistics?.lastOrderDate || null,
          daysOverdue:     c.statistics?.lastOrderDate
            ? Math.floor(
                (now - new Date(c.statistics.lastOrderDate)) / (1000 * 60 * 60 * 24)
              )
            : 0,
        }))
      ),
  ])

  // Growth Rate calculate karo
  const lastMonthCustomers = growthData[growthData.length - 2]?.newCustomers || 0
  const thisMonthCustomers = growthData[growthData.length - 1]?.newCustomers || 0
  const growthRate =
    lastMonthCustomers > 0
      ? parseFloat(
          (((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100).toFixed(2)
        )
      : 0

  // Retention Rate calculate karo
  const retentionRate =
    totalActive > 0
      ? parseFloat(((retentionCount / totalActive) * 100).toFixed(2))
      : 0

  // Upcoming Events process karo
  const upcomingEvents = []
  const today = new Date()

  upcomingEventsRaw.forEach(customer => {
    if (customer.dateOfBirth) {
      const dob       = new Date(customer.dateOfBirth)
      const thisYear  = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      const daysUntil = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24))

      if (daysUntil >= 0 && daysUntil <= 30) {
        upcomingEvents.push({
          _id:          customer._id,
          customerCode: customer.customerCode,
          customerName: customer.customerName,
          eventType:    'birthday',
          date:         thisYear.toISOString(),
          daysUntil,
        })
      }
    }

    if (customer.anniversaryDate) {
      const ann       = new Date(customer.anniversaryDate)
      const thisYear  = new Date(today.getFullYear(), ann.getMonth(), ann.getDate())
      const daysUntil = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24))

      if (daysUntil >= 0 && daysUntil <= 30) {
        upcomingEvents.push({
          _id:          customer._id,
          customerCode: customer.customerCode,
          customerName: customer.customerName,
          eventType:    'anniversary',
          date:         thisYear.toISOString(),
          daysUntil,
        })
      }
    }
  })

  const sortedEvents = upcomingEvents
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10)

  return {
    ...basicStats,
    growthRate,
    retentionRate,
    growthData,
    retentionData,
    topCustomers: topCustomers.map(c => ({
      ...c,
      fullName: `${c.firstName} ${c.lastName || ''}`.trim(),
    })),
    segmentationData: {
      byTier:     segmentationByTier,
      byType:     segmentationByType,
      byCategory: segmentationByCategory,
    },
    geographyData,
    purchasePatternData,
    upcomingEvents:     sortedEvents,
    atRiskCustomers,
    outstandingPayments,
  }
}

/**
 * Normalize customer data
 */
export const normalizeCustomerData = (data) => {
  const normalized = { ...data };

  if (normalized.phone) {
    normalized.phone = normalized.phone.trim().replace(/\s/g, '');
  }

  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase().trim();
  }

  if (normalized.firstName) {
    normalized.firstName = normalized.firstName
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (normalized.lastName) {
    normalized.lastName = normalized.lastName
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (normalized.aadharNumber) {
    normalized.aadharNumber = normalized.aadharNumber.replace(/\s/g, '');
  }

  if (normalized.panNumber) {
    normalized.panNumber = normalized.panNumber.toUpperCase().trim();
  }

  if (normalized.gstNumber) {
    normalized.gstNumber = normalized.gstNumber.toUpperCase().trim();
  }

  return normalized;
};

/**
 * Cache customer
 */
export const cacheCustomer = async (customer) => {
  await cache.set(`customer:${customer._id}`, customer, 1800);
  await cache.set(
    `customer:phone:${customer.shopId}:${customer.phone}`,
    customer._id.toString(),
    3600
  );
};

/**
 * Invalidate customer cache
 */
export const invalidateCustomerCache = async (customerId, shopId, phone) => {
  await cache.del(`customer:${customerId}`);
  await cache.del(`customer:phone:${shopId}:${phone}`);
  await cache.deletePattern(`customers:${shopId}:*`);
};

/**
 * Update shop statistics
 */
export const updateShopStatistics = async (shopId) => {
  const shop = await JewelryShop.findById(shopId);
  if (shop) {
    shop.statistics.totalCustomers = await Customer.countDocuments({
      shopId,
      deletedAt: null,
    });
    await shop.save();
  }
};