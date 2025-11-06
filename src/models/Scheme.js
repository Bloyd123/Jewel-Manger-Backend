import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema(
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

    // Scheme Identification
    schemeCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    schemeName: {
      type: String,
      required: [true, 'Scheme name is required'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },

    // Scheme Type
    schemeType: {
      type: String,
      enum: ['gold_saving', 'installment', 'advance_booking', 'festival_scheme', 'custom'],
      default: 'gold_saving',
      required: true,
    },

    // Duration
    duration: {
      months: {
        type: Number,
        required: true,
        min: 1,
      },
      weeks: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Installment Details
    installments: {
      totalInstallments: {
        type: Number,
        required: true,
        min: 1,
      },
      installmentAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'custom'],
        default: 'monthly',
      },
      dueDay: {
        type: Number, // 1-31 for monthly, 1-7 for weekly
        min: 1,
        max: 31,
      },
    },

    // Bonus & Benefits
    bonus: {
      hasBonus: {
        type: Boolean,
        default: false,
      },
      bonusType: {
        type: String,
        enum: ['percentage', 'flat_amount', 'free_making', 'discount'],
        default: 'percentage',
      },
      bonusValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      bonusDescription: String,
    },

    // Maturity Details
    maturity: {
      totalSchemeAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      bonusAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalMaturityValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      canWithdrawCash: {
        type: Boolean,
        default: false,
      },
      withdrawalCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Eligibility & Conditions
    eligibility: {
      minAge: {
        type: Number,
        default: 18,
        min: 0,
      },
      maxAge: {
        type: Number,
        default: null,
      },
      minInstallmentAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      requiresKYC: {
        type: Boolean,
        default: true,
      },
    },

    // Terms & Conditions
    termsAndConditions: [
      {
        condition: String,
        order: Number,
      },
    ],

    // Redemption Rules
    redemption: {
      canRedeemEarly: {
        type: Boolean,
        default: false,
      },
      earlyRedemptionPenalty: {
        type: {
          type: String,
          enum: ['percentage', 'flat', 'none'],
          default: 'none',
        },
        value: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      gracePeriodDays: {
        type: Number,
        default: 30,
        min: 0,
      },
      missedInstallmentPenalty: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Pricing & Rates
    pricing: {
      useCurrentMetalRate: {
        type: Boolean,
        default: true,
      },
      fixedMetalRate: {
        type: Number,
        default: null,
      },
      makingChargesDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      waiveMakingCharges: {
        type: Boolean,
        default: false,
      },
    },

    // Limits
    limits: {
      maxEnrollments: {
        type: Number,
        default: null, // null = unlimited
      },
      currentEnrollments: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxEnrollmentsPerCustomer: {
        type: Number,
        default: 3,
        min: 1,
      },
    },

    // Validity
    validity: {
      startDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      endDate: {
        type: Date,
        required: true,
      },
      enrollmentDeadline: Date,
      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },

    // Marketing
    marketing: {
      isFeatured: {
        type: Boolean,
        default: false,
      },
      displayOrder: {
        type: Number,
        default: 0,
      },
      imageUrl: String,
      bannerUrl: String,
      highlights: [String],
    },

    // Statistics
    statistics: {
      totalEnrollments: {
        type: Number,
        default: 0,
      },
      activeEnrollments: {
        type: Number,
        default: 0,
      },
      completedEnrollments: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageInstallmentCollection: {
        type: Number,
        default: 0,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'expired', 'archived'],
      default: 'draft',
      index: true,
    },

    // Approval
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,

    // Notes & Tags
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: String,
    tags: [String],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
schemeSchema.index({ organizationId: 1, shopId: 1, schemeCode: 1 }, { unique: true });
schemeSchema.index({ shopId: 1, status: 1 });
schemeSchema.index({ shopId: 1, 'validity.isActive': 1 });
schemeSchema.index({ schemeType: 1 });
schemeSchema.index({ 'validity.startDate': 1, 'validity.endDate': 1 });

// Virtuals
schemeSchema.virtual('enrollments', {
  ref: 'SchemeEnrollment',
  localField: '_id',
  foreignField: 'schemeId',
});

schemeSchema.virtual('isExpired').get(function () {
  return new Date() > this.validity.endDate;
});

schemeSchema.virtual('isEnrollmentOpen').get(function () {
  const now = new Date();
  if (this.validity.enrollmentDeadline) {
    return now <= this.validity.enrollmentDeadline && this.validity.isActive;
  }
  return this.validity.isActive && !this.isExpired;
});

schemeSchema.virtual('totalDuration').get(function () {
  return this.duration.months + this.duration.weeks / 4;
});

// Pre-save middleware
schemeSchema.pre('save', function (next) {
  // Calculate maturity values
  this.maturity.totalSchemeAmount =
    this.installments.totalInstallments * this.installments.installmentAmount;

  if (this.bonus.hasBonus) {
    if (this.bonus.bonusType === 'percentage') {
      this.maturity.bonusAmount = (this.maturity.totalSchemeAmount * this.bonus.bonusValue) / 100;
    } else if (this.bonus.bonusType === 'flat_amount') {
      this.maturity.bonusAmount = this.bonus.bonusValue;
    }
  }

  this.maturity.totalMaturityValue = this.maturity.totalSchemeAmount + this.maturity.bonusAmount;

  // Check if enrollment is still open
  if (
    this.validity.maxEnrollments &&
    this.limits.currentEnrollments >= this.limits.maxEnrollments
  ) {
    this.validity.isActive = false;
  }

  // Check expiry
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
  }

  next();
});

// Soft delete middleware
schemeSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
schemeSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.validity.isActive = false;
  return this.save();
};

schemeSchema.methods.restore = function () {
  this.deletedAt = null;
  this.validity.isActive = true;
  return this.save();
};

schemeSchema.methods.activate = function () {
  this.status = 'active';
  this.validity.isActive = true;
  return this.save();
};

schemeSchema.methods.pause = function () {
  this.status = 'paused';
  this.validity.isActive = false;
  return this.save();
};

schemeSchema.methods.archive = function () {
  this.status = 'archived';
  this.validity.isActive = false;
  return this.save();
};

schemeSchema.methods.approve = function (userId) {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

schemeSchema.methods.reject = function (userId, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

schemeSchema.methods.incrementEnrollment = function () {
  this.limits.currentEnrollments += 1;
  this.statistics.totalEnrollments += 1;
  this.statistics.activeEnrollments += 1;
  return this.save();
};

schemeSchema.methods.decrementEnrollment = function () {
  this.limits.currentEnrollments = Math.max(0, this.limits.currentEnrollments - 1);
  this.statistics.activeEnrollments = Math.max(0, this.statistics.activeEnrollments - 1);
  return this.save();
};

schemeSchema.methods.calculateMaturityValue = function (paidInstallments) {
  const paidAmount = paidInstallments * this.installments.installmentAmount;
  let bonusAmount = 0;

  if (this.bonus.hasBonus && paidInstallments === this.installments.totalInstallments) {
    if (this.bonus.bonusType === 'percentage') {
      bonusAmount = (paidAmount * this.bonus.bonusValue) / 100;
    } else if (this.bonus.bonusType === 'flat_amount') {
      bonusAmount = this.bonus.bonusValue;
    }
  }

  return {
    paidAmount,
    bonusAmount,
    totalValue: paidAmount + bonusAmount,
  };
};

schemeSchema.methods.calculateEarlyRedemptionValue = function (paidInstallments) {
  const maturity = this.calculateMaturityValue(paidInstallments);
  let penalty = 0;

  if (this.redemption.earlyRedemptionPenalty.type === 'percentage') {
    penalty = (maturity.paidAmount * this.redemption.earlyRedemptionPenalty.value) / 100;
  } else if (this.redemption.earlyRedemptionPenalty.type === 'flat') {
    penalty = this.redemption.earlyRedemptionPenalty.value;
  }

  return {
    ...maturity,
    penalty,
    netValue: maturity.totalValue - penalty,
  };
};

// Static Methods
schemeSchema.statics.generateSchemeCode = async function (shopId, prefix = 'SCH') {
  const currentYear = new Date().getFullYear().toString().slice(-2);

  let number = 1;
  const lastScheme = await this.findOne({ shopId }).sort({ schemeCode: -1 }).select('schemeCode');

  if (lastScheme && lastScheme.schemeCode) {
    const lastNumber = parseInt(lastScheme.schemeCode.split('-').pop());
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }

  return `${prefix}-${currentYear}-${String(number).padStart(4, '0')}`;
};

schemeSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options });
};

schemeSchema.statics.findActive = function (shopId) {
  return this.find({
    shopId,
    status: 'active',
    'validity.isActive': true,
    deletedAt: null,
  });
};

schemeSchema.statics.findByType = function (shopId, schemeType) {
  return this.find({
    shopId,
    schemeType,
    deletedAt: null,
  });
};

schemeSchema.statics.findFeatured = function (shopId) {
  return this.find({
    shopId,
    'marketing.isFeatured': true,
    'validity.isActive': true,
    status: 'active',
    deletedAt: null,
  }).sort({ 'marketing.displayOrder': 1 });
};

schemeSchema.statics.findExpiringSoon = function (shopId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    shopId,
    'validity.endDate': { $lte: futureDate, $gte: new Date() },
    status: 'active',
    deletedAt: null,
  });
};

export default mongoose.model('Scheme', schemeSchema);
