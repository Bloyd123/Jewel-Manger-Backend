import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    // Multi-tenant
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: [true, 'Shop ID is required'],
      index: true,
    },

    // Customer Code
    customerCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Basic Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Invalid phone number'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Invalid phone number'],
    },
    whatsappNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Invalid WhatsApp number'],
    },

    // Personal Details
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: null,
    },
    anniversaryDate: Date,

    // Address
    address: {
      street: String,
      landmark: String,
      area: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Invalid pincode'],
      },
    },

    // KYC Details
    aadharNumber: {
      type: String,
      trim: true,
      sparse: true,
      match: [/^[0-9]{12}$/, 'Invalid Aadhar number'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN'],
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },

    // Customer Type
    customerType: {
      type: String,
      enum: ['retail', 'wholesale', 'vip', 'regular'],
      default: 'retail',
    },
    customerCategory: {
      type: String,
      enum: ['gold', 'silver', 'diamond', 'platinum', 'mixed'],
      default: 'mixed',
    },

    // Loyalty & Membership
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    membershipTier: {
      type: String,
      enum: ['standard', 'silver', 'gold', 'platinum'],
      default: 'standard',
    },
    membershipNumber: String,
    membershipStartDate: Date,
    membershipExpiryDate: Date,

    // Financial Details
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
    },

    // Statistics
    statistics: {
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      lastOrderDate: Date,
      lastVisitDate: Date,
      firstOrderDate: Date,
    },

    // Preferences
    preferences: {
      preferredMetal: {
        type: String,
        enum: ['gold', 'silver', 'platinum', 'diamond'],
        default: null,
      },
      preferredPurity: String,
      preferredDesign: String,
      preferredPaymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi', 'cheque', 'emi'],
        default: null,
      },
      communicationPreference: {
        type: String,
        enum: ['email', 'sms', 'whatsapp', 'call', 'none'],
        default: 'sms',
      },
    },

    // Social Media
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
    },

    // Documents
    documents: [
      {
        documentType: {
          type: String,
          enum: ['aadhar', 'pan', 'passport', 'driving_license', 'voter_id', 'other'],
          required: true,
        },
        documentNumber: String,
        documentUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Profile Image
    profileImage: String,

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: String,
    blacklistedAt: Date,

    // Notes & Tags
    notes: {
      type: String,
      maxlength: 1000,
    },
    tags: [String],
    internalNotes: String,

    // Source
    source: {
      type: String,
      enum: ['walk_in', 'referral', 'online', 'phone', 'social_media', 'advertisement', 'other'],
      default: 'walk_in',
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
customerSchema.index({ organizationId: 1, shopId: 1, customerCode: 1 }, { unique: true });
customerSchema.index({ organizationId: 1, phone: 1 });
customerSchema.index({ shopId: 1, isActive: 1 });
customerSchema.index({ email: 1 }, { sparse: true });
customerSchema.index({ customerType: 1 });
customerSchema.index({ membershipTier: 1 });

// Virtuals
customerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

customerSchema.virtual('isVIP').get(function () {
  return this.customerType === 'vip' || this.membershipTier === 'platinum';
});

customerSchema.virtual('orders', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'customerId',
});

// Soft delete middleware
customerSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
customerSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

customerSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

customerSchema.methods.addLoyaltyPoints = function (points) {
  this.loyaltyPoints += points;
  return this.save();
};

customerSchema.methods.redeemLoyaltyPoints = function (points) {
  if (this.loyaltyPoints >= points) {
    this.loyaltyPoints -= points;
    return this.save();
  }
  throw new Error('Insufficient loyalty points');
};

customerSchema.methods.updateBalance = function (amount) {
  this.currentBalance += amount;
  this.totalDue = this.currentBalance < 0 ? Math.abs(this.currentBalance) : 0;
  return this.save();
};

customerSchema.methods.blacklist = function (reason) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.blacklistedAt = new Date();
  this.isActive = false;
  return this.save();
};

customerSchema.methods.removeBlacklist = function () {
  this.isBlacklisted = false;
  this.blacklistReason = null;
  this.blacklistedAt = null;
  this.isActive = true;
  return this.save();
};

// Static Methods
customerSchema.statics.generateCustomerCode = async function (shopId, prefix = 'CUST') {
  let code = `${prefix}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  let counter = 1;

  while (await this.findOne({ shopId, customerCode: code })) {
    code = `${prefix}${String(Math.floor(Math.random() * 100000) + counter).padStart(5, '0')}`;
    counter++;
  }

  return code;
};

customerSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options });
};

customerSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone, deletedAt: null });
};

customerSchema.statics.findVIPCustomers = function (shopId) {
  return this.find({
    shopId,
    $or: [{ customerType: 'vip' }, { membershipTier: 'platinum' }],
    deletedAt: null,
    isActive: true,
  });
};

customerSchema.statics.findByMembershipTier = function (shopId, tier) {
  return this.find({ shopId, membershipTier: tier, deletedAt: null, isActive: true });
};

customerSchema.statics.findTopCustomers = function (shopId, limit = 10) {
  return this.find({ shopId, deletedAt: null, isActive: true })
    .sort({ 'statistics.totalSpent': -1 })
    .limit(limit);
};

export default mongoose.model('Customer', customerSchema);
