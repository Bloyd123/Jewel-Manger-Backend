// FILE: src/__tests__/setup/testSetup.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// ─────────────────────────────────────────────
// FACTORY: Organization
// ─────────────────────────────────────────────
export const makeOrgId = () => new mongoose.Types.ObjectId();

// ─────────────────────────────────────────────
// FACTORY: Shop
// ─────────────────────────────────────────────
export const makeShop = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  organizationId: new mongoose.Types.ObjectId(),
  name: 'Test Jewellers',
  code: 'SHOP001',
  phone: '9876543210',
  address: {
    street: '12 MG Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  managerId: new mongoose.Types.ObjectId(),
  isActive: true,
  deletedAt: null,
  ...overrides,
});

// ─────────────────────────────────────────────
// FACTORY: User
// ─────────────────────────────────────────────
export const makeUser = (role = 'shop_admin', overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  organizationId: new mongoose.Types.ObjectId(),
  role,
  isActive: true,
  firstName: 'Test',
  lastName: 'User',
  email: `${role}@test.com`,
  ...overrides,
});

// ─────────────────────────────────────────────
// FACTORY: Customer Body (valid Indian data)
// ─────────────────────────────────────────────
export const makeCustomerBody = (overrides = {}) => ({
  firstName: 'Ravi',
  lastName: 'Sharma',
  phone: '9876543210',
  email: 'ravi.sharma@example.com',
  customerType: 'retail',
  customerCategory: 'gold',
  gender: 'male',
  dateOfBirth: '1990-05-15',
  address: {
    street: '12 MG Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  source: 'walk_in',
  preferences: {
    preferredMetal: 'gold',
    communicationPreference: 'whatsapp',
  },
  creditLimit: 50000,
  notes: 'Test customer note',
  tags: ['gold-buyer'],
  ...overrides,
});

// ─────────────────────────────────────────────
// FACTORY: Customer DB Document
// ─────────────────────────────────────────────
export const makeCustomer = (shopId, organizationId, overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  shopId,
  organizationId,
  customerCode: 'CUST00001',
  firstName: 'Ravi',
  lastName: 'Sharma',
  fullName: 'Ravi Sharma',
  phone: '9876543210',
  email: 'ravi.sharma@example.com',
  customerType: 'retail',
  membershipTier: 'standard',
  loyaltyPoints: 0,
  totalDue: 0,
  totalPurchases: 0,
  isActive: true,
  isBlacklisted: false,
  deletedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ─────────────────────────────────────────────
// FACTORY: UserShopAccess
// ─────────────────────────────────────────────
export const makeShopAccess = (userId, shopId, orgId, role = 'staff', overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  userId,
  shopId,
  organizationId: orgId,
  role,
  isActive: true,
  deletedAt: null,
  revokedAt: null,
  accessEndDate: null,
  hasPermission: jest.fn().mockReturnValue(true),
  hasAnyPermission: jest.fn().mockReturnValue(true),
  hasAllPermissions: jest.fn().mockReturnValue(true),
  updateLastAccess: jest.fn().mockResolvedValue(true),
  ...overrides,
});