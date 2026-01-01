import Customer from '../models/Customer.js';
import { NotFoundError } from '../utils/AppError.js';
import cache from '../utils/cache.js';
import mongoose from 'mongoose';

class CustomerRepository {
  // Create Customer
  async create(customerData) {
    const customer = await Customer.create(customerData);
    await this.cacheCustomer(customer);
    return customer;
  }

  // Find By ID
  async findById(customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new NotFoundError('Invalid customer ID');
    }

    const cacheKey = `customer:${customerId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const customer = await Customer.findOne({
      _id: customerId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    await this.cacheCustomer(customer);
    return customer;
  }

  // Find By Shop and ID
  async findByShopAndId(shopId, customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new NotFoundError('Invalid customer ID');
    }

    const customer = await Customer.findOne({
      _id: customerId,
      shopId,
      deletedAt: null,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found in this shop');
    }

    return customer;
  }

  // Find By Phone
  async findByPhone(shopId, phone) {
    const cacheKey = `customer:phone:${shopId}:${phone}`;
    const cachedId = cache.get(cacheKey);

    if (cachedId) {
      try {
        return await this.findById(cachedId);
      } catch (error) {
        cache.del(cacheKey);
      }
    }

    const customer = await Customer.findOne({
      shopId,
      phone,
      deletedAt: null,
    });

    if (customer) {
      cache.set(cacheKey, customer._id.toString(), 3600);
      await this.cacheCustomer(customer);
    }

    return customer;
  }

  // Check Duplicate Phone
  async checkDuplicatePhone(shopId, phone, excludeId = null) {
    const query = {
      shopId,
      phone,
      deletedAt: null,
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return await Customer.findOne(query);
  }

  // Get Last Customer Code
  async getLastCustomerCode(shopId) {
    const lastCustomer = await Customer.findOne({ shopId })
      .sort({ customerCode: -1 })
      .select('customerCode')
      .lean();

    return lastCustomer?.customerCode || null;
  }

  // Generate Sequential Customer Code
  async generateCustomerCode(shopId, prefix = 'CUST') {
    const lastCode = await this.getLastCustomerCode(shopId);

    let number = 1;
    if (lastCode) {
      const lastNumber = parseInt(lastCode.replace(prefix, ''));
      if (!isNaN(lastNumber)) {
        number = lastNumber + 1;
      }
    }

    return `${prefix}${String(number).padStart(5, '0')}`;
  }

  // Update Customer
  async update(customerId, updateData) {
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    await this.invalidateCache(customer);
    return customer;
  }

  // Soft Delete
  async softDelete(customerId) {
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    await this.invalidateCache(customer);
    return customer;
  }

  // Find All with Filters
  async findAll(filters, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt', select, populate } = options;

    const skip = (page - 1) * limit;

    const query = Customer.find(filters);

    if (select) query.select(select);
    if (populate) query.populate(populate);

    const [customers, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filters),
    ]);

    return {
      data: customers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        pageSize: parseInt(limit),
        totalItems: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // Search Customers
  async search(shopId, searchTerm) {
    const regex = new RegExp(searchTerm, 'i');

    return await Customer.find({
      shopId,
      deletedAt: null,
      $or: [
        { firstName: regex },
        { lastName: regex },
        { phone: regex },
        { email: regex },
        { customerCode: regex },
      ],
    })
      .limit(20)
      .select('customerCode firstName lastName phone email customerType loyaltyPoints')
      .lean();
  }

  // Get Top Customers
  async getTopCustomers(shopId, limit = 10) {
    return await Customer.find({
      shopId,
      deletedAt: null,
      isActive: true,
    })
      .sort({ 'statistics.totalSpent': -1 })
      .limit(limit)
      .select(
        'customerCode firstName lastName statistics.totalSpent statistics.totalOrders membershipTier'
      )
      .lean();
  }

  // Get Customer Statistics
  async getStatistics(shopId) {
    const stats = await Customer.aggregate([
      { $match: { shopId: mongoose.Types.ObjectId(shopId), deletedAt: null } },
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
      }
    );
  }

  // Cache Customer
  async cacheCustomer(customer) {
    const customerObj = customer.toObject ? customer.toObject() : customer;
    cache.set(`customer:${customer._id}`, customerObj, 1800);
    if (customer.phone && customer.shopId) {
      cache.set(
        `customer:phone:${customer.shopId}:${customer.phone}`,
        customer._id.toString(),
        3600
      );
    }
  }

  // Invalidate Cache
  async invalidateCache(customer) {
    cache.del(`customer:${customer._id}`);
    if (customer.phone && customer.shopId) {
      cache.del(`customer:phone:${customer.shopId}:${customer.phone}`);
    }
    cache.deletePattern(`customers:${customer.shopId}:*`);
  }
}

export default new CustomerRepository();
