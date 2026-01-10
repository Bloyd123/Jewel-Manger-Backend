// FILE: src/api/customer/customer.service.js
// Customer Business Logic Service

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

class CustomerService {
  /**
   * Generate Sequential Customer Code
   */
  async generateCustomerCode(shopId, prefix = 'CUST') {
    const lastCustomer = await Customer.findOne({ shopId })
      .sort({ customerCode: -1 })
      .select('customerCode')
      .lean();

    let number = 1;
    if (lastCustomer && lastCustomer.customerCode) {
      const lastNumber = parseInt(lastCustomer.customerCode.replace(prefix, ''));
      if (!isNaN(lastNumber)) {
        number = lastNumber + 1;
      }
    }

    return `${prefix}${String(number).padStart(5, '0')}`;
  }

  /**
   * Check if phone already exists in shop
   */
  async checkDuplicatePhone(shopId, phone, excludeCustomerId = null) {
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
  }

  /**
   * Create a new customer
   */
  async createCustomer(shopId, customerData, userId) {
    // Check shop exists
    const shop = await JewelryShop.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    // Normalize data
    const normalizedData = this.normalizeCustomerData(customerData);

    // Check duplicate phone in same shop
    const duplicate = await this.checkDuplicatePhone(shopId, normalizedData.phone);
    if (duplicate) {
      throw new ConflictError(
        `Customer with phone ${normalizedData.phone} already exists in this shop`
      );
    }

    // Generate customer code
    const customerCode = await this.generateCustomerCode(shopId);

    // Create customer
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

    // Update shop statistics
    await this.updateShopStatistics(shopId);

    // Cache customer
    await this.cacheCustomer(customer);

    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId, shopId = null) {
    // Try cache first
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

      // Cache for 30 minutes
      await cache.set(cacheKey, customer, 1800);
    }

    return customer;
  }

  /**
   * Search customer by phone/email/code
   */
  async searchCustomer(shopId, searchParams) {
    const { phone, email, customerCode, search } = searchParams;

    // Build query
    const query = { shopId, deletedAt: null };

    if (phone) {
      // Try cache first for phone lookup
      const cacheKey = `customer:phone:${shopId}:${phone}`;
      const cachedId = await cache.get(cacheKey);

      if (cachedId) {
        return await this.getCustomerById(cachedId, shopId);
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

    // Cache if found by phone
    if (customer && phone) {
      const cacheKey = `customer:phone:${shopId}:${phone}`;
      await cache.set(cacheKey, customer._id.toString(), 3600);
    }

    return customer;
  }

  /**
   * Get all customers with filters and pagination
   */
  async getCustomers(shopId, filters = {}, paginationOptions = {}) {
    // Build query
    const query = { shopId, deletedAt: null };

    // Search filter
    if (filters.search) {
      query.$or = [
        { firstName: new RegExp(filters.search, 'i') },
        { lastName: new RegExp(filters.search, 'i') },
        { phone: new RegExp(filters.search) },
        { email: new RegExp(filters.search, 'i') },
        { customerCode: new RegExp(filters.search, 'i') },
      ];
    }

    // Customer type filter
    if (filters.customerType) {
      query.customerType = filters.customerType;
    }

    // Membership tier filter
    if (filters.membershipTier) {
      query.membershipTier = filters.membershipTier;
    }

    // Active/Inactive filter
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    // Has balance filter
    if (filters.hasBalance) {
      query.totalDue = { $gt: 0 };
    }

    // VIP only filter
    if (filters.vipOnly) {
      query.$or = [{ customerType: 'vip' }, { membershipTier: 'platinum' }];
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    // Check cache for common queries
    const cacheKey = `customers:${shopId}:${JSON.stringify(filters)}:${JSON.stringify(paginationOptions)}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute paginated query
    const result = await paginate(Customer, query, {
      page: paginationOptions.page || 1,
      limit: paginationOptions.limit || 20,
      sort: paginationOptions.sort || '-createdAt',
      select:
        'firstName lastName phone email customerCode customerType membershipTier loyaltyPoints totalPurchases totalDue isActive statistics.lastOrderDate createdAt',
      populate: [{ path: 'referredBy', select: 'firstName lastName customerCode' }],
    });

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId, shopId, updateData, userId) {
    // Get existing customer
    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check if blacklisted
    if (customer.isBlacklisted) {
      throw new ValidationError('Cannot update blacklisted customer');
    }

    // Normalize data
    const normalizedData = this.normalizeCustomerData(updateData);

    // Check phone uniqueness if changing
    if (normalizedData.phone && normalizedData.phone !== customer.phone) {
      const duplicate = await this.checkDuplicatePhone(shopId, normalizedData.phone, customerId);
      if (duplicate) {
        throw new ConflictError('Phone number already exists');
      }
    }

    // Track changes for audit
    const changes = {};
    Object.keys(normalizedData).forEach(key => {
      if (JSON.stringify(customer[key]) !== JSON.stringify(normalizedData[key])) {
        changes[key] = {
          old: customer[key],
          new: normalizedData[key],
        };
      }
    });

    // Update customer
    Object.assign(customer, normalizedData);
    customer.updatedBy = userId;
    await customer.save();

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    return { customer, changes };
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(customerId, shopId, userId) {
    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check if has outstanding balance
    if (customer.totalDue > 0) {
      throw new ValidationError(
        `Cannot delete customer with outstanding balance of ₹${customer.totalDue}`
      );
    }

    // Soft delete
    await customer.softDelete();

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    // Update shop statistics
    await this.updateShopStatistics(shopId);

    return customer;
  }

  /**
   * Blacklist customer
   */
  async blacklistCustomer(customerId, shopId, reason, userId) {
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

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    return customer;
  }

  /**
   * Remove blacklist
   */
  async removeBlacklist(customerId, shopId, userId) {
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

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    return customer;
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(customerId, shopId, points, reason = null) {
    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    await customer.addLoyaltyPoints(points);

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    return customer;
  }

  /**
   * Redeem loyalty points
   */
  async redeemLoyaltyPoints(customerId, shopId, points) {
    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    if (customer.loyaltyPoints < points) {
      throw new ValidationError('Insufficient loyalty points');
    }

    await customer.redeemLoyaltyPoints(points);

    // Invalidate cache
    await this.invalidateCustomerCache(customerId, shopId, customer.phone);

    return customer;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(shopId) {
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
  }

  /**
   * Normalize customer data
   */
  normalizeCustomerData(data) {
    const normalized = { ...data };

    // Phone
    if (normalized.phone) {
      normalized.phone = normalized.phone.trim().replace(/\s/g, '');
    }

    // Email
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    // Names
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

    // Aadhar
    if (normalized.aadharNumber) {
      normalized.aadharNumber = normalized.aadharNumber.replace(/\s/g, '');
    }

    // PAN
    if (normalized.panNumber) {
      normalized.panNumber = normalized.panNumber.toUpperCase().trim();
    }

    // GST
    if (normalized.gstNumber) {
      normalized.gstNumber = normalized.gstNumber.toUpperCase().trim();
    }

    return normalized;
  }

  /**
   * Cache customer
   */
  async cacheCustomer(customer) {
    await cache.set(`customer:${customer._id}`, customer, 1800);
    await cache.set(
      `customer:phone:${customer.shopId}:${customer.phone}`,
      customer._id.toString(),
      3600
    );
  }

  /**
   * Invalidate customer cache
   */
  async invalidateCustomerCache(customerId, shopId, phone) {
    await cache.del(`customer:${customerId}`);
    await cache.del(`customer:phone:${shopId}:${phone}`);
    await cache.deletePattern(`customers:${shopId}:*`);
  }

  /**
   * Update shop statistics
   */
  async updateShopStatistics(shopId) {
    const shop = await JewelryShop.findById(shopId);
    if (shop) {
      shop.statistics.totalCustomers = await Customer.countDocuments({
        shopId,
        deletedAt: null,
      });
      await shop.save();
    }
  }
}

export default new CustomerService();
