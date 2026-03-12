// FILE: src/__tests__/customer/customer.service.test.js
//
// Tests for customer.service.js
// Covers: CRUD, multi-tenant isolation, race conditions,
//         loyalty points, blacklist, duplicate phone, cache logic
//

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS FIRST — before any imports (ESM hoisting requirement)
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../models/Customer.js', () => ({
  default: {
    create:         jest.fn(),
    findOne:        jest.fn(),
    find:           jest.fn(),
    aggregate:      jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../models/Shop.js', () => ({
  default: { findById: jest.fn() },
}));

jest.mock('../../utils/cache.js', () => ({
  default: {
    get:           jest.fn(),
    set:           jest.fn(),
    del:           jest.fn(),
    deletePattern: jest.fn(),
  },
}));

jest.mock('../../utils/pagination.js', () => ({
  paginate: jest.fn(),
}));

jest.mock('../../utils/AppError.js', () => ({
  NotFoundError:   class extends Error { constructor(m) { super(m); this.name = 'NotFoundError';   } },
  ConflictError:   class extends Error { constructor(m) { super(m); this.name = 'ConflictError';   } },
  ValidationError: class extends Error { constructor(m) { super(m); this.name = 'ValidationError'; } },
  BadRequestError: class extends Error { constructor(m) { super(m); this.name = 'BadRequestError'; } },
}));

jest.mock('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS — after mocks
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { makeOrgId, makeCustomerBody, makeCustomer } from '../setup/testSetup.js';
import * as customerService from '../../api/customer/customer.service.js';

import Customer from '../../models/Customer.js';
import Shop     from '../../models/Shop.js';
import cache    from '../../utils/cache.js';
import { paginate } from '../../utils/pagination.js';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TEST DATA
// ─────────────────────────────────────────────────────────────────────────────
const ORG_A   = makeOrgId();
const ORG_B   = makeOrgId();
const SHOP_A  = new mongoose.Types.ObjectId();
const SHOP_B  = new mongoose.Types.ObjectId();
const USER_ID = new mongoose.Types.ObjectId();

const shopADoc = {
  _id:            SHOP_A,
  organizationId: ORG_A,
  name:           'Shop A',
  statistics:     { totalCustomers: 0 },
  save:           jest.fn().mockResolvedValue(true),
};

const shopBDoc = {
  _id:            SHOP_B,
  organizationId: ORG_B,
  name:           'Shop B',
  statistics:     { totalCustomers: 0 },
  save:           jest.fn().mockResolvedValue(true),
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET MOCKS BEFORE EACH TEST
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  cache.get.mockResolvedValue(null);        // default: cache miss
  cache.set.mockResolvedValue(true);
  cache.del.mockResolvedValue(true);
  cache.deletePattern.mockResolvedValue(true);
  Customer.countDocuments.mockResolvedValue(5);
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. createCustomer
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.createCustomer', () => {

  const validBody = makeCustomerBody();

  it('✅ creates customer successfully with valid data', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    const createdDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.create.mockResolvedValue(createdDoc);

    const result = await customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID);

    expect(Shop.findById).toHaveBeenCalledWith(SHOP_A.toString());
    expect(Customer.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ phone: '9876543210' });
  });

  it('❌ throws NotFoundError when shop does not exist', async () => {
    Shop.findById.mockResolvedValue(null);

    await expect(
      customerService.createCustomer('000000000000000000000000', validBody, USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError', message: 'Shop not found' });

    expect(Customer.create).not.toHaveBeenCalled();
  });

  it('❌ throws ConflictError when phone already exists in same shop', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(makeCustomer(SHOP_A, ORG_A));

    await expect(
      customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID)
    ).rejects.toMatchObject({ name: 'ConflictError' });

    expect(Customer.create).not.toHaveBeenCalled();
  });

  it('✅ same phone number allowed in different organization shop', async () => {
    Shop.findById.mockResolvedValueOnce(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    const createdDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.create.mockResolvedValue(createdDoc);

    const result = await customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID);

    expect(result).toBeTruthy();
    expect(Customer.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: SHOP_A.toString() })
    );
  });

  it('❌ race condition — concurrent duplicate phone requests are handled', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeCustomer(SHOP_A, ORG_A));

    const duplicateKeyError = new Error('E11000 duplicate key error');
    duplicateKeyError.code = 11000;

    Customer.create
      .mockResolvedValueOnce(makeCustomer(SHOP_A, ORG_A))
      .mockRejectedValueOnce(duplicateKeyError);

    const [result1, result2] = await Promise.allSettled([
      customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID),
      customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID),
    ]);

    expect(result1.status).toBe('fulfilled');
    expect(result2.status).toBe('rejected');
    expect(result2.reason.code).toBe(11000);
  });

  it('✅ caches customer after creation', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    const createdDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.create.mockResolvedValue(createdDoc);

    await customerService.createCustomer(SHOP_A.toString(), validBody, USER_ID);

    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('customer:'),
      expect.anything(),
      expect.any(Number)
    );
  });

  it('✅ normalizes phone number (trims spaces)', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(makeCustomer(SHOP_A, ORG_A));

    await customerService.createCustomer(
      SHOP_A.toString(),
      makeCustomerBody({ phone: '98765 43210' }),
      USER_ID
    );

    expect(Customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '9876543210' })
    );
  });

  it('✅ normalizes email to lowercase', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(makeCustomer(SHOP_A, ORG_A));

    await customerService.createCustomer(
      SHOP_A.toString(),
      makeCustomerBody({ email: 'RAVI.SHARMA@EXAMPLE.COM' }),
      USER_ID
    );

    expect(Customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ravi.sharma@example.com' })
    );
  });

  it('✅ normalizes firstName to Title Case', async () => {
    Shop.findById.mockResolvedValue(shopADoc);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(makeCustomer(SHOP_A, ORG_A));

    await customerService.createCustomer(
      SHOP_A.toString(),
      makeCustomerBody({ firstName: 'ravi' }),
      USER_ID
    );

    expect(Customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ravi' })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. getCustomerById
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.getCustomerById', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ returns customer from DB when cache miss', async () => {
    cache.get.mockResolvedValue(null);
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(customerDoc),
    });

    const result = await customerService.getCustomerById(customerId, SHOP_A.toString());

    expect(cache.get).toHaveBeenCalledWith(`customer:${customerId}`);
    expect(result).toMatchObject({ phone: '9876543210' });
    expect(cache.set).toHaveBeenCalled();
  });

  it('✅ returns customer from CACHE when cache hit (no DB call)', async () => {
    const cachedCustomer = makeCustomer(SHOP_A, ORG_A);
    cache.get.mockResolvedValue(cachedCustomer);

    const result = await customerService.getCustomerById(customerId, SHOP_A.toString());

    expect(result).toEqual(cachedCustomer);
    expect(Customer.findOne).not.toHaveBeenCalled();
  });

  it('❌ throws NotFoundError when customer does not exist', async () => {
    cache.get.mockResolvedValue(null);
    Customer.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    });

    await expect(
      customerService.getCustomerById('000000000000000000000000', SHOP_A.toString())
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org B cannot fetch Org A customer (shopId mismatch)', async () => {
    cache.get.mockResolvedValue(null);
    Customer.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    });

    await expect(
      customerService.getCustomerById(customerId, SHOP_B.toString())
    ).rejects.toMatchObject({ name: 'NotFoundError', message: 'Customer not found' });

    expect(Customer.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: SHOP_B.toString() })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. searchCustomer
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.searchCustomer', () => {

  it('✅ finds customer by phone', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(customerDoc),
    });

    const result = await customerService.searchCustomer(SHOP_A.toString(), { phone: '9876543210' });
    expect(result).toMatchObject({ phone: '9876543210' });
  });

  it('✅ finds customer by email', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(customerDoc),
    });

    const result = await customerService.searchCustomer(SHOP_A.toString(), {
      email: 'ravi.sharma@example.com',
    });
    expect(result).toBeTruthy();
  });

  it('✅ finds customer by customerCode', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(customerDoc),
    });

    const result = await customerService.searchCustomer(SHOP_A.toString(), {
      customerCode: 'CUST00001',
    });
    expect(result).toBeTruthy();
  });

  it('✅ finds customer by partial name search', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(customerDoc),
    });

    const result = await customerService.searchCustomer(SHOP_A.toString(), { search: 'Ravi' });
    expect(result).toBeTruthy();
  });

  it('✅ returns null when customer not found', async () => {
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(null),
    });

    const result = await customerService.searchCustomer(SHOP_A.toString(), { phone: '9000000000' });
    expect(result).toBeNull();
  });

  it('❌ search is always scoped to shopId (cannot leak across orgs)', async () => {
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(null),
    });

    await customerService.searchCustomer(SHOP_B.toString(), { phone: '9876543210' });

    expect(Customer.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: SHOP_B.toString() })
    );
    expect(Customer.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ shopId: SHOP_A.toString() })
    );
  });

  it('✅ phone search result is cached for next call', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A);
    cache.get.mockResolvedValue(null);
    Customer.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(customerDoc),
    });

    await customerService.searchCustomer(SHOP_A.toString(), { phone: '9876543210' });

    expect(cache.set).toHaveBeenCalledWith(
      `customer:phone:${SHOP_A.toString()}:9876543210`,
      expect.any(String),
      3600
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. updateCustomer
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.updateCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  const makeUpdatableCustomer = (overrides = {}) => ({
    ...makeCustomer(SHOP_A, ORG_A),
    isBlacklisted: false,
    save:          jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  it('✅ updates customer successfully', async () => {
    const customerDoc = makeUpdatableCustomer();
    Customer.findOne
      .mockResolvedValueOnce(customerDoc)
      .mockResolvedValueOnce(null);

    const result = await customerService.updateCustomer(
      customerId, SHOP_A.toString(), { lastName: 'Kumar' }, USER_ID
    );

    expect(result).toHaveProperty('customer');
    expect(result).toHaveProperty('changes');
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.updateCustomer(customerId, SHOP_A.toString(), { lastName: 'Kumar' }, USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ throws ValidationError when trying to update blacklisted customer', async () => {
    const blacklisted = makeUpdatableCustomer({ isBlacklisted: true });
    Customer.findOne.mockResolvedValue(blacklisted);

    await expect(
      customerService.updateCustomer(customerId, SHOP_A.toString(), { firstName: 'New' }, USER_ID)
    ).rejects.toMatchObject({ name: 'ValidationError', message: 'Cannot update blacklisted customer' });
  });

  it('❌ throws ConflictError when new phone already taken in same shop', async () => {
    const existingCustomer = makeUpdatableCustomer({ phone: '9876543210' });
    Customer.findOne
      .mockResolvedValueOnce(existingCustomer)
      .mockResolvedValueOnce(makeCustomer(SHOP_A, ORG_A, { phone: '9999999999' }));

    await expect(
      customerService.updateCustomer(
        customerId, SHOP_A.toString(), { phone: '9999999999' }, USER_ID
      )
    ).rejects.toMatchObject({ name: 'ConflictError' });
  });

  it('❌ Org B cannot update Org A customer (shopId filter)', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.updateCustomer(customerId, SHOP_B.toString(), { firstName: 'Hacked' }, USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });

    expect(Customer.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ shopId: SHOP_B.toString() })
    );
  });

  it('✅ invalidates cache after update', async () => {
    const customerDoc = makeUpdatableCustomer();
    Customer.findOne
      .mockResolvedValueOnce(customerDoc)
      .mockResolvedValueOnce(null);

    await customerService.updateCustomer(
      customerId, SHOP_A.toString(), { lastName: 'NewName' }, USER_ID
    );

    expect(cache.del).toHaveBeenCalled();
    expect(cache.deletePattern).toHaveBeenCalled();
  });

  it('✅ tracks changes correctly', async () => {
    const customerDoc = makeUpdatableCustomer({ lastName: 'OldName' });
    Customer.findOne
      .mockResolvedValueOnce(customerDoc)
      .mockResolvedValueOnce(null);

    const { changes } = await customerService.updateCustomer(
      customerId, SHOP_A.toString(), { lastName: 'NewName' }, USER_ID
    );

    expect(changes).toHaveProperty('lastName');
    expect(changes.lastName.old).toBe('OldName');
    expect(changes.lastName.new).toBe('NewName');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. deleteCustomer
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.deleteCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ soft deletes customer with zero balance', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { totalDue: 0 }),
      softDelete: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    const result = await customerService.deleteCustomer(customerId, SHOP_A.toString(), USER_ID);

    expect(customerDoc.softDelete).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('❌ throws ValidationError when customer has outstanding balance', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A, { totalDue: 15000 });
    Customer.findOne.mockResolvedValue(customerDoc);

    await expect(
      customerService.deleteCustomer(customerId, SHOP_A.toString(), USER_ID)
    ).rejects.toMatchObject({
      name:    'ValidationError',
      message: expect.stringContaining('15000'),
    });
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.deleteCustomer(customerId, SHOP_A.toString(), USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org B cannot delete Org A customer', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.deleteCustomer(customerId, SHOP_B.toString(), USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('✅ invalidates all related caches after delete', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { totalDue: 0 }),
      softDelete: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.deleteCustomer(customerId, SHOP_A.toString(), USER_ID);

    expect(cache.del).toHaveBeenCalledTimes(2);
    expect(cache.deletePattern).toHaveBeenCalledWith(
      expect.stringContaining(SHOP_A.toString())
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. blacklistCustomer
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.blacklistCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();
  const reason     = 'Repeated payment defaults over 3 months.';

  it('✅ blacklists customer successfully', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { isBlacklisted: false }),
      blacklist: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.blacklistCustomer(customerId, SHOP_A.toString(), reason, USER_ID);

    expect(customerDoc.blacklist).toHaveBeenCalledWith(reason);
  });

  it('❌ throws ValidationError if customer already blacklisted', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A, { isBlacklisted: true });
    Customer.findOne.mockResolvedValue(customerDoc);

    await expect(
      customerService.blacklistCustomer(customerId, SHOP_A.toString(), reason, USER_ID)
    ).rejects.toMatchObject({
      name:    'ValidationError',
      message: 'Customer is already blacklisted',
    });
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.blacklistCustomer(customerId, SHOP_A.toString(), reason, USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org B cannot blacklist Org A customer', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.blacklistCustomer(customerId, SHOP_B.toString(), reason, USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. removeBlacklist
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.removeBlacklist', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ removes blacklist from blacklisted customer', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { isBlacklisted: true }),
      removeBlacklist: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.removeBlacklist(customerId, SHOP_A.toString(), USER_ID);

    expect(customerDoc.removeBlacklist).toHaveBeenCalled();
  });

  it('❌ throws ValidationError if customer is NOT blacklisted', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A, { isBlacklisted: false });
    Customer.findOne.mockResolvedValue(customerDoc);

    await expect(
      customerService.removeBlacklist(customerId, SHOP_A.toString(), USER_ID)
    ).rejects.toMatchObject({
      name:    'ValidationError',
      message: 'Customer is not blacklisted',
    });
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.removeBlacklist(customerId, SHOP_A.toString(), USER_ID)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. addLoyaltyPoints
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.addLoyaltyPoints', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ adds loyalty points successfully', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 100 }),
      addLoyaltyPoints: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.addLoyaltyPoints(customerId, SHOP_A.toString(), 50, 'Diwali bonus');

    expect(customerDoc.addLoyaltyPoints).toHaveBeenCalledWith(50);
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.addLoyaltyPoints(customerId, SHOP_A.toString(), 50)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('✅ invalidates cache after adding points', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A),
      addLoyaltyPoints: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.addLoyaltyPoints(customerId, SHOP_A.toString(), 100);

    expect(cache.del).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. redeemLoyaltyPoints
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.redeemLoyaltyPoints', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ redeems points when sufficient balance', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 500 }),
      redeemLoyaltyPoints: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.redeemLoyaltyPoints(customerId, SHOP_A.toString(), 200);

    expect(customerDoc.redeemLoyaltyPoints).toHaveBeenCalledWith(200);
  });

  it('❌ throws ValidationError when insufficient points', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 50 });
    Customer.findOne.mockResolvedValue(customerDoc);

    await expect(
      customerService.redeemLoyaltyPoints(customerId, SHOP_A.toString(), 500)
    ).rejects.toMatchObject({
      name:    'ValidationError',
      message: 'Insufficient loyalty points',
    });
  });

  it('❌ throws ValidationError when redeeming exactly 1 more than balance', async () => {
    const customerDoc = makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 99 });
    Customer.findOne.mockResolvedValue(customerDoc);

    await expect(
      customerService.redeemLoyaltyPoints(customerId, SHOP_A.toString(), 100)
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('✅ can redeem exact balance (boundary case)', async () => {
    const customerDoc = {
      ...makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 100 }),
      redeemLoyaltyPoints: jest.fn().mockResolvedValue(true),
    };
    Customer.findOne.mockResolvedValue(customerDoc);

    await customerService.redeemLoyaltyPoints(customerId, SHOP_A.toString(), 100);

    expect(customerDoc.redeemLoyaltyPoints).toHaveBeenCalledWith(100);
  });

  it('❌ throws NotFoundError when customer not found', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.redeemLoyaltyPoints(customerId, SHOP_A.toString(), 100)
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});

describe('customerService.getCustomerStatistics', () => {

  it('✅ returns statistics for shop', async () => {
    Customer.aggregate.mockResolvedValue([{
      totalCustomers:     50,
      activeCustomers:    45,
      vipCustomers:       5,
      totalOutstanding:   200000,
      totalLoyaltyPoints: 3000,
      avgLifetimeValue:   75000,
    }]);

    const result = await customerService.getCustomerStatistics(SHOP_A.toString());

    expect(result).toMatchObject({
      totalCustomers:  50,
      activeCustomers: 45,
      vipCustomers:    5,
    });
  });

  it(' returns zeros when no customers exist', async () => {
    Customer.aggregate.mockResolvedValue([]);

    const result = await customerService.getCustomerStatistics(SHOP_A.toString());

    expect(result).toEqual({
      totalCustomers:     0,
      activeCustomers:    0,
      vipCustomers:       0,
      totalOutstanding:   0,
      totalLoyaltyPoints: 0,
      avgLifetimeValue:   0,
    });
  });

  it('✅ statistics are scoped to shopId only', async () => {
    Customer.aggregate.mockResolvedValue([{ totalCustomers: 10 }]);

    await customerService.getCustomerStatistics(SHOP_A.toString());

    expect(Customer.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({ shopId: SHOP_A.toString() }),
        }),
      ])
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. normalizeCustomerData
// ═════════════════════════════════════════════════════════════════════════════
describe('customerService.normalizeCustomerData', () => {

  it('✅ trims phone spaces', () => {
    const result = customerService.normalizeCustomerData({ phone: '98765 43210' });
    expect(result.phone).toBe('9876543210');
  });

  it('✅ lowercases email', () => {
    const result = customerService.normalizeCustomerData({ email: 'RAVI@EXAMPLE.COM' });
    expect(result.email).toBe('ravi@example.com');
  });

  it('✅ title-cases firstName', () => {
    const result = customerService.normalizeCustomerData({ firstName: 'ravi kumar' });
    expect(result.firstName).toBe('Ravi Kumar');
  });

  it('✅ title-cases lastName', () => {
    const result = customerService.normalizeCustomerData({ lastName: 'sharma' });
    expect(result.lastName).toBe('Sharma');
  });

  it('✅ uppercases PAN number', () => {
    const result = customerService.normalizeCustomerData({ panNumber: 'abcde1234f' });
    expect(result.panNumber).toBe('ABCDE1234F');
  });

  it('✅ uppercases GST number', () => {
    const result = customerService.normalizeCustomerData({ gstNumber: '27abcde1234f1z5' });
    expect(result.gstNumber).toBe('27ABCDE1234F1Z5');
  });

  it('✅ removes Aadhar spaces', () => {
    const result = customerService.normalizeCustomerData({ aadharNumber: '2345 6789 0123' });
    expect(result.aadharNumber).toBe('234567890123');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. MULTI-TENANT ISOLATION — Full Suite
// ═════════════════════════════════════════════════════════════════════════════
describe('🔒 Multi-tenant Isolation Tests', () => {

  it('❌ Org A staff cannot read Org B customers via getCustomerById', async () => {
    cache.get.mockResolvedValue(null);
    Customer.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    });

    await expect(
      customerService.getCustomerById(
        new mongoose.Types.ObjectId().toString(),
        SHOP_B.toString()
      )
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org A staff cannot update Org B customers', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.updateCustomer(
        new mongoose.Types.ObjectId().toString(),
        SHOP_B.toString(),
        { firstName: 'Hack' },
        USER_ID
      )
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org A staff cannot delete Org B customers', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.deleteCustomer(
        new mongoose.Types.ObjectId().toString(),
        SHOP_B.toString(),
        USER_ID
      )
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('❌ Org A staff cannot blacklist Org B customers', async () => {
    Customer.findOne.mockResolvedValue(null);

    await expect(
      customerService.blacklistCustomer(
        new mongoose.Types.ObjectId().toString(),
        SHOP_B.toString(),
        'Some reason here',
        USER_ID
      )
    ).rejects.toMatchObject({ name: 'NotFoundError' });
  });

  it('✅ each shop can have customers with same phone independently', async () => {
    Shop.findById
      .mockResolvedValueOnce(shopADoc)
      .mockResolvedValueOnce(shopBDoc);

    Customer.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    Customer.create
      .mockResolvedValueOnce(makeCustomer(SHOP_A, ORG_A))
      .mockResolvedValueOnce(makeCustomer(SHOP_B, ORG_B));

    const [r1, r2] = await Promise.all([
      customerService.createCustomer(SHOP_A.toString(), makeCustomerBody({ phone: '9876543210' }), USER_ID),
      customerService.createCustomer(SHOP_B.toString(), makeCustomerBody({ phone: '9876543210' }), USER_ID),
    ]);

    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
  });

  it('✅ getCustomers list is always scoped to requesting shopId', async () => {
    cache.get.mockResolvedValue(null);
    paginate.mockResolvedValue({ data: [], pagination: {} });

    await customerService.getCustomers(SHOP_A.toString(), {}, { page: 1, limit: 20 });

    expect(paginate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ shopId: SHOP_A.toString() }),
      expect.anything()
    );
  });
});