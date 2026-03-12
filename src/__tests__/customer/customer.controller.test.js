// FILE: src/__tests__/customer/customer.controller.test.js
//
// Tests for customer.controller.js
// Covers: HTTP responses, auth checks, role-based access,
//         multi-tenant isolation, validation failures
//
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { makeUser, makeShop, makeCustomer, makeCustomerBody, makeShopAccess } from '../setup/testSetup.js';

// ─────────────────────────────────────────────────────────────────────────────
// Mock customerService so controller tests don't touch DB
// ─────────────────────────────────────────────────────────────────────────────
const mockCreateCustomer      = jest.fn();
const mockGetCustomers        = jest.fn();
const mockGetCustomerById     = jest.fn();
const mockSearchCustomer      = jest.fn();
const mockUpdateCustomer      = jest.fn();
const mockDeleteCustomer      = jest.fn();
const mockBlacklistCustomer   = jest.fn();
const mockRemoveBlacklist     = jest.fn();
const mockAddLoyaltyPoints    = jest.fn();
const mockRedeemLoyaltyPoints = jest.fn();
const mockGetCustomerStats    = jest.fn();

jest.mock('../../api/customer/customer.service.js', () => ({
  createCustomer:       mockCreateCustomer,
  getCustomers:         mockGetCustomers,
  getCustomerById:      mockGetCustomerById,
  searchCustomer:       mockSearchCustomer,
  updateCustomer:       mockUpdateCustomer,
  deleteCustomer:       mockDeleteCustomer,
  blacklistCustomer:    mockBlacklistCustomer,
  removeBlacklist:      mockRemoveBlacklist,
  addLoyaltyPoints:     mockAddLoyaltyPoints,
  redeemLoyaltyPoints:  mockRedeemLoyaltyPoints,
  getCustomerStatistics:mockGetCustomerStats,
}));

// Mock express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

// Mock eventLogger
jest.mock('../../utils/eventLogger.js', () => ({
  default: { logActivity: jest.fn().mockResolvedValue(true) },
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// Mock sendResponse utils
const mockSendSuccess      = jest.fn();
const mockSendCreated      = jest.fn();
const mockSendBadRequest   = jest.fn();
const mockSendNotFound     = jest.fn();
const mockSendConflict     = jest.fn();
const mockSendInternalError= jest.fn();

jest.mock('../../utils/sendResponse.js', () => ({
  sendSuccess:       mockSendSuccess,
  sendCreated:       mockSendCreated,
  sendBadRequest:    mockSendBadRequest,
  sendNotFound:      mockSendNotFound,
  sendConflict:      mockSendConflict,
  sendInternalError: mockSendInternalError,
}));

import * as controller from '../../api/customer/customer.controller.js';
import { validationResult } from 'express-validator';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — make req / res mocks
// ─────────────────────────────────────────────────────────────────────────────
const ORG_A  = new mongoose.Types.ObjectId();
const ORG_B  = new mongoose.Types.ObjectId();
const SHOP_A = new mongoose.Types.ObjectId();
const SHOP_B = new mongoose.Types.ObjectId();

const makeReq = (overrides = {}) => ({
  params: { shopId: SHOP_A.toString() },
  body: makeCustomerBody(),
  query: {},
  user: makeUser('shop_admin', { organizationId: ORG_A }),
  ip: '127.0.0.1',
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: validation passes
  validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. createCustomer controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.createCustomer', () => {

  it('✅ returns 201 on successful creation', async () => {
    const newCustomer = makeCustomer(SHOP_A, ORG_A);
    mockCreateCustomer.mockResolvedValue(newCustomer);

    const req = makeReq();
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockCreateCustomer).toHaveBeenCalledWith(
      SHOP_A.toString(),
      req.body,
      req.user._id
    );
    expect(mockSendCreated).toHaveBeenCalledWith(
      res,
      'Customer created successfully',
      expect.objectContaining({ customer: expect.any(Object) })
    );
  });

  it('❌ returns 400 when validation fails', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Phone is required', param: 'phone' }],
    });

    const req = makeReq({ body: { firstName: 'Ravi' } }); // missing phone
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(
      res,
      'Validation failed',
      expect.any(Array)
    );
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  it('❌ returns 409 when phone already exists (ConflictError)', async () => {
    const conflictErr = new Error('Phone already exists');
    conflictErr.name = 'ConflictError';
    mockCreateCustomer.mockRejectedValue(conflictErr);

    const req = makeReq();
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockSendConflict).toHaveBeenCalledWith(res, conflictErr.message);
  });

  it('❌ returns 500 on unexpected error', async () => {
    mockCreateCustomer.mockRejectedValue(new Error('DB connection failed'));

    const req = makeReq();
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockSendInternalError).toHaveBeenCalled();
  });

  // ─── AUTH & ROLE tests ────────────────────────────────────────
  it('❌ returns 400 with missing required fields (phone)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Phone number is required', param: 'phone' }],
    });

    const req = makeReq({ body: { firstName: 'Ravi' } });
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
  });

  it('❌ returns 400 with invalid phone format', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid Indian phone number', param: 'phone' }],
    });

    const req = makeReq({ body: makeCustomerBody({ phone: '12345' }) });
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. getCustomers controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.getCustomers', () => {

  it('✅ returns customer list with pagination', async () => {
    const mockResult = {
      data: [makeCustomer(SHOP_A, ORG_A)],
      pagination: { total: 1, page: 1, limit: 20 },
    };
    mockGetCustomers.mockResolvedValue(mockResult);
    mockGetCustomerStats.mockResolvedValue({ totalCustomers: 1 });

    const req = makeReq({ query: { page: '1', limit: '20' } });
    const res = makeRes();

    await controller.getCustomers(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customers fetched successfully',
      expect.objectContaining({ customers: expect.any(Array), summary: expect.any(Object) }),
      expect.objectContaining({ pagination: expect.any(Object) })
    );
  });

  it('✅ passes filters correctly to service', async () => {
    mockGetCustomers.mockResolvedValue({ data: [], pagination: {} });
    mockGetCustomerStats.mockResolvedValue({});

    const req = makeReq({
      query: {
        customerType: 'vip',
        membershipTier: 'platinum',
        isActive: 'true',
        hasBalance: 'true',
        vipOnly: 'true',
        search: 'Ravi',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    });
    const res = makeRes();

    await controller.getCustomers(req, res);

    expect(mockGetCustomers).toHaveBeenCalledWith(
      SHOP_A.toString(),
      expect.objectContaining({
        customerType: 'vip',
        membershipTier: 'platinum',
        isActive: 'true',
        hasBalance: true,
        vipOnly: true,
        search: 'Ravi',
      }),
      expect.any(Object)
    );
  });

  it('❌ returns 500 on service error', async () => {
    mockGetCustomers.mockRejectedValue(new Error('DB error'));

    const req = makeReq();
    const res = makeRes();

    await controller.getCustomers(req, res);

    expect(mockSendInternalError).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. getCustomerById controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.getCustomerById', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ returns customer on success', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A);
    mockGetCustomerById.mockResolvedValue(customer);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.getCustomerById(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer fetched successfully',
      expect.objectContaining({ customer })
    );
  });

  it('❌ returns 404 when service returns null', async () => {
    mockGetCustomerById.mockResolvedValue(null);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.getCustomerById(req, res);

    expect(mockSendNotFound).toHaveBeenCalledWith(res, 'Customer not found');
  });

  it('❌ returns 404 when NotFoundError thrown', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockGetCustomerById.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.getCustomerById(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });

  // ─── MULTI-TENANT ─────────────────────────────────────────────
  it('❌ Org B user gets 404 when fetching Org A customer', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockGetCustomerById.mockRejectedValue(err);

    // Org B user trying to access SHOP_A customer
    const orgBUser = makeUser('shop_admin', { organizationId: ORG_B });
    const req = makeReq({
      user: orgBUser,
      params: { shopId: SHOP_A.toString(), customerId }, // wrong shop
    });
    const res = makeRes();

    await controller.getCustomerById(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. searchCustomer controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.searchCustomer', () => {

  it('✅ finds and returns customer', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A);
    mockSearchCustomer.mockResolvedValue(customer);

    const req = makeReq({ query: { phone: '9876543210' } });
    const res = makeRes();

    await controller.searchCustomer(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer found',
      expect.objectContaining({ exists: true, customer })
    );
  });

  it('✅ returns exists:false when not found', async () => {
    mockSearchCustomer.mockResolvedValue(null);

    const req = makeReq({ query: { phone: '9000000000' } });
    const res = makeRes();

    await controller.searchCustomer(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer not found',
      expect.objectContaining({ exists: false, customer: null })
    );
  });

  it('❌ returns 400 when no search params provided', async () => {
    const req = makeReq({ query: {} }); // no phone, email, customerCode, search
    const res = makeRes();

    await controller.searchCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(
      res,
      'Please provide phone, email, customerCode, or search query'
    );
    expect(mockSearchCustomer).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. updateCustomer controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.updateCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ updates and returns customer', async () => {
    const updated = makeCustomer(SHOP_A, ORG_A, { lastName: 'Kumar' });
    mockUpdateCustomer.mockResolvedValue({ customer: updated, changes: { lastName: { old: 'Sharma', new: 'Kumar' } } });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { lastName: 'Kumar' },
    });
    const res = makeRes();

    await controller.updateCustomer(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer updated successfully',
      expect.objectContaining({ customer: updated })
    );
  });

  it('❌ returns 400 on validation failure', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid phone number', param: 'phone' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { phone: '123' },
    });
    const res = makeRes();

    await controller.updateCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it('❌ returns 404 when customer not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockUpdateCustomer.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.updateCustomer(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });

  it('❌ returns 409 on phone conflict', async () => {
    const err = new Error('Phone number already exists');
    err.name = 'ConflictError';
    mockUpdateCustomer.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { phone: '9999999999' },
    });
    const res = makeRes();

    await controller.updateCustomer(req, res);

    expect(mockSendConflict).toHaveBeenCalled();
  });

  // ─── MULTI-TENANT ─────────────────────────────────────────────
  it('❌ Org B user gets 404 trying to update Org A customer', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockUpdateCustomer.mockRejectedValue(err);

    const orgBUser = makeUser('shop_admin', { organizationId: ORG_B });
    const req = makeReq({
      user: orgBUser,
      params: { shopId: SHOP_A.toString(), customerId },
      body: { firstName: 'Hacked' },
    });
    const res = makeRes();

    await controller.updateCustomer(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. deleteCustomer controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.deleteCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ deletes customer successfully', async () => {
    const deleted = makeCustomer(SHOP_A, ORG_A);
    mockDeleteCustomer.mockResolvedValue(deleted);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.deleteCustomer(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer deleted successfully',
      expect.objectContaining({ customer: deleted })
    );
  });

  it('❌ returns 404 when not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockDeleteCustomer.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.deleteCustomer(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });

  it('❌ returns 400 when customer has outstanding balance', async () => {
    const err = new Error('Cannot delete customer with outstanding balance of ₹15000');
    err.name = 'ValidationError';
    mockDeleteCustomer.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.deleteCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(
      res,
      expect.stringContaining('15000')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. blacklistCustomer controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.blacklistCustomer', () => {
  const customerId = new mongoose.Types.ObjectId().toString();
  const reason = 'Customer has defaulted on payments repeatedly over 3 months.';

  it('✅ blacklists customer and returns 200', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A, { isBlacklisted: true });
    mockBlacklistCustomer.mockResolvedValue(customer);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { reason },
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockBlacklistCustomer).toHaveBeenCalledWith(
      customerId, SHOP_A.toString(), reason, req.user._id
    );
    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Customer blacklisted successfully',
      expect.objectContaining({ customer })
    );
  });

  it('❌ returns 400 when validation fails (reason too short)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Reason must be between 10 and 500 characters', param: 'reason' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { reason: 'Bad' }, // too short
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
    expect(mockBlacklistCustomer).not.toHaveBeenCalled();
  });

  it('❌ returns 400 when validation fails (no reason)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Blacklist reason is required', param: 'reason' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: {},
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
  });

  it('❌ returns 400 when customer already blacklisted', async () => {
    const err = new Error('Customer is already blacklisted');
    err.name = 'ValidationError';
    mockBlacklistCustomer.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { reason },
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(res, 'Customer is already blacklisted');
  });

  it('❌ returns 404 when customer not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockBlacklistCustomer.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { reason },
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });

  // ─── MULTI-TENANT ─────────────────────────────────────────────
  it('❌ Org B manager cannot blacklist Org A customer', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockBlacklistCustomer.mockRejectedValue(err);

    const orgBUser = makeUser('manager', { organizationId: ORG_B });
    const req = makeReq({
      user: orgBUser,
      params: { shopId: SHOP_A.toString(), customerId },
      body: { reason },
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. removeBlacklist controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.removeBlacklist', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ removes blacklist successfully', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A, { isBlacklisted: false });
    mockRemoveBlacklist.mockResolvedValue(customer);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.removeBlacklist(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Blacklist removed successfully',
      expect.objectContaining({ customer })
    );
  });

  it('❌ returns 400 when customer is not blacklisted', async () => {
    const err = new Error('Customer is not blacklisted');
    err.name = 'ValidationError';
    mockRemoveBlacklist.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.removeBlacklist(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(res, 'Customer is not blacklisted');
  });

  it('❌ returns 404 when customer not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockRemoveBlacklist.mockRejectedValue(err);

    const req = makeReq({ params: { shopId: SHOP_A.toString(), customerId } });
    const res = makeRes();

    await controller.removeBlacklist(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });

  // Route-level: only shop_admin can unblacklist (not manager) — tested in route tests
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. addLoyaltyPoints controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.addLoyaltyPoints', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ adds loyalty points and returns updated customer', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 150 });
    mockAddLoyaltyPoints.mockResolvedValue(customer);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 50, reason: 'Diwali bonus' },
    });
    const res = makeRes();

    await controller.addLoyaltyPoints(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Added 50 loyalty points',
      expect.objectContaining({ customer: expect.objectContaining({ loyaltyPoints: 150 }) })
    );
  });

  it('❌ returns 400 when validation fails (points = 0)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Points must be a positive integer', param: 'points' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 0 },
    });
    const res = makeRes();

    await controller.addLoyaltyPoints(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
    expect(mockAddLoyaltyPoints).not.toHaveBeenCalled();
  });

  it('❌ returns 400 when validation fails (negative points)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Points must be a positive integer', param: 'points' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: -50 },
    });
    const res = makeRes();

    await controller.addLoyaltyPoints(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
  });

  it('❌ returns 404 when customer not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockAddLoyaltyPoints.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 100 },
    });
    const res = makeRes();

    await controller.addLoyaltyPoints(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. redeemLoyaltyPoints controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.redeemLoyaltyPoints', () => {
  const customerId = new mongoose.Types.ObjectId().toString();

  it('✅ redeems loyalty points successfully', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A, { loyaltyPoints: 300 });
    mockRedeemLoyaltyPoints.mockResolvedValue(customer);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 200 },
    });
    const res = makeRes();

    await controller.redeemLoyaltyPoints(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Redeemed 200 loyalty points',
      expect.objectContaining({ customer: expect.any(Object) })
    );
  });

  it('❌ returns 400 when insufficient points (ValidationError)', async () => {
    const err = new Error('Insufficient loyalty points');
    err.name = 'ValidationError';
    mockRedeemLoyaltyPoints.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 9999 },
    });
    const res = makeRes();

    await controller.redeemLoyaltyPoints(req, res);

    expect(mockSendBadRequest).toHaveBeenCalledWith(res, 'Insufficient loyalty points');
  });

  it('❌ returns 400 on validation failure (points = 0)', async () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Points must be a positive integer', param: 'points' }],
    });

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 0 },
    });
    const res = makeRes();

    await controller.redeemLoyaltyPoints(req, res);

    expect(mockSendBadRequest).toHaveBeenCalled();
    expect(mockRedeemLoyaltyPoints).not.toHaveBeenCalled();
  });

  it('❌ returns 404 when customer not found', async () => {
    const err = new Error('Customer not found');
    err.name = 'NotFoundError';
    mockRedeemLoyaltyPoints.mockRejectedValue(err);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId },
      body: { points: 100 },
    });
    const res = makeRes();

    await controller.redeemLoyaltyPoints(req, res);

    expect(mockSendNotFound).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. getCustomerAnalytics controller
// ═════════════════════════════════════════════════════════════════════════════
describe('controller.getCustomerAnalytics', () => {

  it('✅ returns analytics summary', async () => {
    const summary = {
      totalCustomers: 100,
      activeCustomers: 90,
      vipCustomers: 10,
      totalOutstanding: 500000,
      totalLoyaltyPoints: 5000,
      avgLifetimeValue: 75000,
    };
    mockGetCustomerStats.mockResolvedValue(summary);

    const req = makeReq();
    const res = makeRes();

    await controller.getCustomerAnalytics(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Analytics fetched successfully',
      expect.objectContaining({ summary })
    );
  });

  it('✅ returns zero stats when shop has no customers', async () => {
    mockGetCustomerStats.mockResolvedValue({
      totalCustomers: 0,
      activeCustomers: 0,
      vipCustomers: 0,
      totalOutstanding: 0,
      totalLoyaltyPoints: 0,
      avgLifetimeValue: 0,
    });

    const req = makeReq();
    const res = makeRes();

    await controller.getCustomerAnalytics(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res, 200, 'Analytics fetched successfully',
      expect.objectContaining({
        summary: expect.objectContaining({ totalCustomers: 0 }),
      })
    );
  });

  it('❌ returns 500 on unexpected error', async () => {
    mockGetCustomerStats.mockRejectedValue(new Error('Aggregation failed'));

    const req = makeReq();
    const res = makeRes();

    await controller.getCustomerAnalytics(req, res);

    expect(mockSendInternalError).toHaveBeenCalled();
  });

  // ─── ROLE-BASED: accountant CAN, staff CANNOT (route-level) ──
  it('✅ shop_admin can access analytics', async () => {
    mockGetCustomerStats.mockResolvedValue({ totalCustomers: 50 });

    const req = makeReq({ user: makeUser('shop_admin', { organizationId: ORG_A }) });
    const res = makeRes();

    await controller.getCustomerAnalytics(req, res);

    expect(mockSendSuccess).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. EVENT LOGGING
// ═════════════════════════════════════════════════════════════════════════════
describe('Event logging after successful operations', () => {
  let eventLogger;
  beforeAll(async () => {
    const mod = await import('../../utils/eventLogger.js');
    eventLogger = mod.default;
  });

  it('✅ logs activity after customer creation', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A);
    mockCreateCustomer.mockResolvedValue(customer);

    const req = makeReq();
    const res = makeRes();

    await controller.createCustomer(req, res);

    expect(eventLogger.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        module: 'customer',
        status: 'success',
        level: 'info',
      })
    );
  });

  it('✅ logs warn level after blacklist', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A, { isBlacklisted: true });
    mockBlacklistCustomer.mockResolvedValue(customer);

    const req = makeReq({
      params: { shopId: SHOP_A.toString(), customerId: customer._id.toString() },
      body: { reason: 'Defaulted on payments multiple times in a row.' },
    });
    const res = makeRes();

    await controller.blacklistCustomer(req, res);

    expect(eventLogger.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'blacklist',
        level: 'warn',
      })
    );
  });

  it('✅ logs warn level after delete', async () => {
    const customer = makeCustomer(SHOP_A, ORG_A);
    mockDeleteCustomer.mockResolvedValue(customer);

    const req = makeReq({
      params: {
        shopId: SHOP_A.toString(),
        customerId: customer._id.toString(),
      },
    });
    const res = makeRes();

    await controller.deleteCustomer(req, res);

    expect(eventLogger.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        level: 'warn',
      })
    );
  });
});