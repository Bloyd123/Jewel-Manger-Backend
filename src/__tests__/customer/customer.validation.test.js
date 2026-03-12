// FILE: src/__tests__/customer/customer.validation.test.js
//
// Tests for customer.validation.js
// Covers: all field validation rules, Indian-specific formats,
//         boundary values, forbidden field updates
//
import { describe, it, expect } from '@jest/globals';
import { validationResult } from 'express-validator';

// Helper: run validators against a mock request body
const runValidation = async (validators, body = {}, params = {}, query = {}) => {
  const req = {
    body,
    params: { shopId: '64f1a2b3c4d5e6f7a8b9c0d1', customerId: '64f1a2b3c4d5e6f7a8b9c0d2', ...params },
    query,
  };

  // express-validator validators are middleware — run them all
  for (const validator of validators) {
    await validator(req, {}, () => {});
  }

  return validationResult(req);
};

import {
  createCustomerValidation,
  updateCustomerValidation,
  customerIdValidation,
  shopIdValidation,
  searchCustomerValidation,
  getCustomersValidation,
  blacklistCustomerValidation,
  loyaltyPointsValidation,
} from '../../api/customer/customer.validation.js';

// ═════════════════════════════════════════════════════════════════════════════
// createCustomerValidation
// ═════════════════════════════════════════════════════════════════════════════
describe('createCustomerValidation', () => {

  const validBody = {
    firstName: 'Ravi',
    phone: '9876543210',
  };

  // ─── firstName ────────────────────────────────────────────────
  it('✅ valid firstName passes', async () => {
    const result = await runValidation(createCustomerValidation, validBody);
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ missing firstName fails', async () => {
    const result = await runValidation(createCustomerValidation, { phone: '9876543210' });
    const errors = result.array();
    expect(errors.some(e => e.path === 'firstName')).toBe(true);
  });

  it('❌ firstName too short (1 char) fails', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, firstName: 'R' });
    expect(result.array().some(e => e.path === 'firstName')).toBe(true);
  });

  it('❌ firstName too long (51 chars) fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, firstName: 'R'.repeat(51),
    });
    expect(result.array().some(e => e.path === 'firstName')).toBe(true);
  });

  it('❌ firstName with numbers fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, firstName: 'Ravi123',
    });
    expect(result.array().some(e => e.path === 'firstName')).toBe(true);
  });

  it('✅ firstName with spaces (two-word name) passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, firstName: 'Ravi Kumar',
    });
    // spaces are allowed in the regex
    expect(result.isEmpty()).toBe(true);
  });

  // ─── phone ────────────────────────────────────────────────────
  it('✅ valid Indian phone starting with 9 passes', async () => {
    const result = await runValidation(createCustomerValidation, validBody);
    expect(result.isEmpty()).toBe(true);
  });

  it('✅ valid Indian phone starting with 6 passes', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, phone: '6543210987' });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ phone starting with 5 fails (not Indian)', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, phone: '5876543210' });
    expect(result.array().some(e => e.path === 'phone')).toBe(true);
  });

  it('❌ phone starting with 1 fails', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, phone: '1234567890' });
    expect(result.array().some(e => e.path === 'phone')).toBe(true);
  });

  it('❌ phone with only 9 digits fails', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, phone: '987654321' });
    expect(result.array().some(e => e.path === 'phone')).toBe(true);
  });

  it('❌ phone with 11 digits fails', async () => {
    const result = await runValidation(createCustomerValidation, { ...validBody, phone: '98765432101' });
    expect(result.array().some(e => e.path === 'phone')).toBe(true);
  });

  it('❌ missing phone fails', async () => {
    const result = await runValidation(createCustomerValidation, { firstName: 'Ravi' });
    expect(result.array().some(e => e.path === 'phone')).toBe(true);
  });

  // ─── email ────────────────────────────────────────────────────
  it('✅ valid email passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, email: 'ravi@example.com',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ invalid email fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, email: 'not-an-email',
    });
    expect(result.array().some(e => e.path === 'email')).toBe(true);
  });

  it('✅ missing email is OK (optional)', async () => {
    const result = await runValidation(createCustomerValidation, validBody);
    expect(result.isEmpty()).toBe(true);
  });

  // ─── dateOfBirth ──────────────────────────────────────────────
  it('✅ valid dateOfBirth (adult) passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, dateOfBirth: '1990-05-15',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ age below 18 fails', async () => {
    const underageDate = new Date();
    underageDate.setFullYear(underageDate.getFullYear() - 17);
    const result = await runValidation(createCustomerValidation, {
      ...validBody, dateOfBirth: underageDate.toISOString().split('T')[0],
    });
    expect(result.array().some(e => e.path === 'dateOfBirth')).toBe(true);
  });

  it('❌ invalid date format fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, dateOfBirth: '15-05-1990', // wrong format
    });
    expect(result.array().some(e => e.path === 'dateOfBirth')).toBe(true);
  });

  // ─── gender ───────────────────────────────────────────────────
  it('✅ valid gender values pass', async () => {
    for (const gender of ['male', 'female', 'other']) {
      const result = await runValidation(createCustomerValidation, { ...validBody, gender });
      expect(result.isEmpty()).toBe(true);
    }
  });

  it('❌ invalid gender fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, gender: 'unknown',
    });
    expect(result.array().some(e => e.path === 'gender')).toBe(true);
  });

  // ─── address.pincode ──────────────────────────────────────────
  it('✅ valid 6-digit pincode passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, address: { pincode: '400001' },
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ 5-digit pincode fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, address: { pincode: '40001' },
    });
    expect(result.array().some(e => e.path === 'address.pincode')).toBe(true);
  });

  it('❌ pincode starting with 0 fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, address: { pincode: '000001' },
    });
    expect(result.array().some(e => e.path === 'address.pincode')).toBe(true);
  });

  // ─── aadharNumber ─────────────────────────────────────────────
  it('✅ valid 12-digit Aadhar passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, aadharNumber: '234567890123',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ Aadhar starting with 0 or 1 fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, aadharNumber: '134567890123',
    });
    expect(result.array().some(e => e.path === 'aadharNumber')).toBe(true);
  });

  it('❌ Aadhar with 11 digits fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, aadharNumber: '23456789012',
    });
    expect(result.array().some(e => e.path === 'aadharNumber')).toBe(true);
  });

  // ─── panNumber ────────────────────────────────────────────────
  it('✅ valid PAN format passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, panNumber: 'ABCDE1234F',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ invalid PAN format fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, panNumber: '1234ABCDE',
    });
    expect(result.array().some(e => e.path === 'panNumber')).toBe(true);
  });

  // ─── customerType ─────────────────────────────────────────────
  it('✅ all valid customerType values pass', async () => {
    for (const type of ['retail', 'wholesale', 'vip', 'regular']) {
      const result = await runValidation(createCustomerValidation, {
        ...validBody, customerType: type,
      });
      expect(result.isEmpty()).toBe(true);
    }
  });

  it('❌ invalid customerType fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, customerType: 'premium',
    });
    expect(result.array().some(e => e.path === 'customerType')).toBe(true);
  });

  // ─── creditLimit ──────────────────────────────────────────────
  it('✅ positive creditLimit passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, creditLimit: 50000,
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('✅ creditLimit of 0 passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, creditLimit: 0,
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ negative creditLimit fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, creditLimit: -1,
    });
    expect(result.array().some(e => e.path === 'creditLimit')).toBe(true);
  });

  // ─── source ───────────────────────────────────────────────────
  it('✅ all valid source values pass', async () => {
    for (const source of ['walk_in', 'referral', 'online', 'phone', 'social_media', 'advertisement', 'other']) {
      const result = await runValidation(createCustomerValidation, { ...validBody, source });
      expect(result.isEmpty()).toBe(true);
    }
  });

  it('❌ invalid source fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, source: 'newspaper',
    });
    expect(result.array().some(e => e.path === 'source')).toBe(true);
  });

  // ─── notes ────────────────────────────────────────────────────
  it('✅ notes under 1000 chars passes', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, notes: 'Short note',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ notes over 1000 chars fails', async () => {
    const result = await runValidation(createCustomerValidation, {
      ...validBody, notes: 'N'.repeat(1001),
    });
    expect(result.array().some(e => e.path === 'notes')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updateCustomerValidation — forbidden field checks
// ═════════════════════════════════════════════════════════════════════════════
describe('updateCustomerValidation — forbidden fields', () => {

  it('❌ cannot update customerCode', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { customerCode: 'CUST99999' },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'customerCode')).toBe(true);
  });

  it('❌ cannot update totalPurchases directly', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { totalPurchases: 999999 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'totalPurchases')).toBe(true);
  });

  it('❌ cannot update loyaltyPoints directly', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { loyaltyPoints: 9999 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'loyaltyPoints')).toBe(true);
  });

  it('✅ can update firstName', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { firstName: 'Suresh' },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('✅ can update isActive', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { isActive: false },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ invalid customerId in params fails', async () => {
    const result = await runValidation(
      updateCustomerValidation,
      { firstName: 'Test' },
      { customerId: 'invalid-id' }
    );
    expect(result.array().some(e => e.path === 'customerId')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// blacklistCustomerValidation
// ═════════════════════════════════════════════════════════════════════════════
describe('blacklistCustomerValidation', () => {

  it('✅ valid reason (10+ chars) passes', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      { reason: 'Defaulted on payments.' },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ missing reason fails', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      {},
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'reason')).toBe(true);
  });

  it('❌ reason under 10 chars fails', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      { reason: 'Bad' },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'reason')).toBe(true);
  });

  it('❌ reason over 500 chars fails', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      { reason: 'R'.repeat(501) },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'reason')).toBe(true);
  });

  it('✅ reason exactly 10 chars passes (boundary)', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      { reason: 'R'.repeat(10) },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('✅ reason exactly 500 chars passes (boundary)', async () => {
    const result = await runValidation(
      blacklistCustomerValidation,
      { reason: 'R'.repeat(500) },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// loyaltyPointsValidation
// ═════════════════════════════════════════════════════════════════════════════
describe('loyaltyPointsValidation', () => {

  it('✅ valid points (positive integer) passes', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 100 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('✅ points = 1 (minimum) passes', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 1 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ points = 0 fails', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 0 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'points')).toBe(true);
  });

  it('❌ negative points fails', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: -10 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'points')).toBe(true);
  });

  it('❌ float points fails', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 10.5 },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'points')).toBe(true);
  });

  it('❌ missing points fails', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      {},
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'points')).toBe(true);
  });

  it('✅ optional reason under 200 chars passes', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 50, reason: 'Festival bonus' },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ reason over 200 chars fails', async () => {
    const result = await runValidation(
      loyaltyPointsValidation,
      { points: 50, reason: 'R'.repeat(201) },
      { customerId: '64f1a2b3c4d5e6f7a8b9c0d2' }
    );
    expect(result.array().some(e => e.path === 'reason')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getCustomersValidation — query param validation
// ═════════════════════════════════════════════════════════════════════════════
describe('getCustomersValidation — query params', () => {

  it('✅ all valid query params pass', async () => {
    const result = await runValidation(
      getCustomersValidation,
      {},
      { shopId: '64f1a2b3c4d5e6f7a8b9c0d1' },
      { page: '1', limit: '20', customerType: 'vip', membershipTier: 'platinum', isActive: 'true' }
    );
    expect(result.isEmpty()).toBe(true);
  });

  it('❌ page = 0 fails', async () => {
    const result = await runValidation(
      getCustomersValidation,
      {},
      { shopId: '64f1a2b3c4d5e6f7a8b9c0d1' },
      { page: '0' }
    );
    expect(result.array().some(e => e.path === 'page')).toBe(true);
  });

  it('❌ limit = 101 fails (max is 100)', async () => {
    const result = await runValidation(
      getCustomersValidation,
      {},
      { shopId: '64f1a2b3c4d5e6f7a8b9c0d1' },
      { limit: '101' }
    );
    expect(result.array().some(e => e.path === 'limit')).toBe(true);
  });

  it('❌ invalid sort field fails', async () => {
    const result = await runValidation(
      getCustomersValidation,
      {},
      { shopId: '64f1a2b3c4d5e6f7a8b9c0d1' },
      { sort: 'hackField' }
    );
    expect(result.array().some(e => e.path === 'sort')).toBe(true);
  });

  it('✅ valid sort fields pass', async () => {
    for (const sort of ['-createdAt', 'firstName', '-totalPurchases', 'loyaltyPoints']) {
      const result = await runValidation(
        getCustomersValidation,
        {},
        { shopId: '64f1a2b3c4d5e6f7a8b9c0d1' },
        { sort }
      );
      expect(result.isEmpty()).toBe(true);
    }
  });
});