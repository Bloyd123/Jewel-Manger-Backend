// FILE: models/SchemeEnrollment.js
import mongoose from 'mongoose';

const installmentScheduleSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate:           { type: Date,   required: true },
    amount:            { type: Number, required: true, min: 0 },
    status: {
      type:    String,
      enum:    ['pending', 'paid', 'overdue', 'missed', 'waived'],
      default: 'pending',
    },
    paidDate:          { type: Date,   default: null },
    paidAmount:        { type: Number, default: 0 },
    paymentId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    penaltyAmount:     { type: Number, default: 0, min: 0 },
    notes:             { type: String, default: '' },
  },
  { _id: true }
);

const schemeEnrollmentSchema = new mongoose.Schema(
  {
    // ── Multi-tenant ──────────────────────────
    organizationId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Organization',
      required: [true, 'Organization ID is required'],
      index:    true,
    },
    shopId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'JewelryShop',
      required: [true, 'Shop ID is required'],
      index:    true,
    },

    // ── Identification ────────────────────────
    enrollmentNumber: {
      type:      String,
      required:  true,
      unique:    true,
      uppercase: true,
      trim:      true,
      index:     true,
    },

    // ── References ────────────────────────────
    schemeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Scheme',
      required: [true, 'Scheme ID is required'],
      index:    true,
    },
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Customer',
      required: [true, 'Customer ID is required'],
      index:    true,
    },
    customerDetails: {
      customerName: String,
      customerCode: String,
      phone:        String,
      email:        String,
    },

    // ── Installment Configuration ─────────────
    installmentAmount: {
      type:     Number,
      required: [true, 'Installment amount is required'],
      min:      0,
    },
    totalInstallments: {
      type:     Number,
      required: true,
      min:      1,
    },
    frequency: {
      type:    String,
      enum:    ['weekly', 'monthly', 'custom'],
      default: 'monthly',
    },

    // ── Payment Tracking ──────────────────────
    paidInstallments:  { type: Number, default: 0, min: 0 },
    missedInstallments:{ type: Number, default: 0, min: 0 },
    totalPaidAmount:   { type: Number, default: 0, min: 0 },
    totalDueAmount:    { type: Number, default: 0, min: 0 },
    totalPenalty:      { type: Number, default: 0, min: 0 },

    // ── Dates ─────────────────────────────────
    startDate:          { type: Date, required: true, default: Date.now },
    nextDueDate:        { type: Date, default: null },
    expectedEndDate:    { type: Date, default: null },
    actualEndDate:      { type: Date, default: null },
    maturityDate:       { type: Date, default: null },

    // ── Installment Schedule ──────────────────
    schedule: [installmentScheduleSchema],

    // ── Maturity ─────────────────────────────
    maturity: {
      totalSchemeAmount:  { type: Number, default: 0, min: 0 },
      bonusAmount:        { type: Number, default: 0, min: 0 },
      totalMaturityValue: { type: Number, default: 0, min: 0 },
      goldEquivalentGrams:{ type: Number, default: 0, min: 0 },
      isCalculated:       { type: Boolean, default: false },
      calculatedAt:       { type: Date, default: null },
    },

    // ── Redemption ────────────────────────────
    redemption: {
      isRedeemed:     { type: Boolean, default: false },
      redemptionDate: { type: Date,    default: null },
      redemptionType: {
        type:    String,
        enum:    ['early', 'normal', null],
        default: null,
      },
      redemptionMode: {
        type:    String,
        enum:    ['cash', 'jewelry', null],
        default: null,
      },
      redemptionValue: { type: Number, default: 0, min: 0 },
      penaltyApplied:  { type: Number, default: 0, min: 0 },
      netRedemptionValue: { type: Number, default: 0, min: 0 },
      linkedSaleId: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Sale',
        default: null,
      },
      notes: String,
    },

    // ── KYC ──────────────────────────────────
    kyc: {
      isVerified:    { type: Boolean, default: false },
      verifiedAt:    { type: Date,    default: null },
      verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      documents: [
        {
          documentType: {
            type:    String,
            enum:    ['aadhar', 'pan', 'passport', 'other'],
            required: true,
          },
          documentNumber: String,
          documentUrl:    String,
          uploadedAt:     { type: Date, default: Date.now },
        },
      ],
    },

    // ── Metal Rate at Enrollment ──────────────
    metalRateAtEnrollment: {
      gold24K: { type: Number, default: 0 },
      gold22K: { type: Number, default: 0 },
      silver:  { type: Number, default: 0 },
      rateDate:{ type: Date,   default: Date.now },
    },

    // ── Status ────────────────────────────────
    status: {
      type:    String,
      enum:    ['active', 'completed', 'cancelled', 'defaulted', 'matured', 'redeemed'],
      default: 'active',
      index:   true,
    },

    // ── Cancellation ─────────────────────────
    cancellation: {
      isCancelled:        { type: Boolean, default: false },
      cancelledAt:        { type: Date,    default: null },
      cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      cancellationReason: { type: String,  default: '' },
      refundAmount:       { type: Number,  default: 0, min: 0 },
      refundStatus: {
        type:    String,
        enum:    ['pending', 'processed', 'not_applicable'],
        default: 'not_applicable',
      },
    },

    // ── Notes ────────────────────────────────
    notes:         { type: String, maxlength: 1000 },
    internalNotes: String,
    tags:          [String],

    // ── Audit ─────────────────────────────────
    enrolledBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    updatedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────
schemeEnrollmentSchema.index({ organizationId: 1, shopId: 1, enrollmentNumber: 1 }, { unique: true });
schemeEnrollmentSchema.index({ schemeId: 1, status: 1 });
schemeEnrollmentSchema.index({ customerId: 1, status: 1 });
schemeEnrollmentSchema.index({ nextDueDate: 1, status: 1 });
schemeEnrollmentSchema.index({ shopId: 1, status: 1 });

// ── Virtuals ──────────────────────────────────
schemeEnrollmentSchema.virtual('scheme', {
  ref:        'Scheme',
  localField: 'schemeId',
  foreignField:'_id',
  justOne:    true,
});

schemeEnrollmentSchema.virtual('customer', {
  ref:        'Customer',
  localField: 'customerId',
  foreignField:'_id',
  justOne:    true,
});

schemeEnrollmentSchema.virtual('completionPercentage').get(function () {
  if (!this.totalInstallments) return 0;
  return Math.round((this.paidInstallments / this.totalInstallments) * 100);
});

schemeEnrollmentSchema.virtual('remainingInstallments').get(function () {
  return Math.max(0, this.totalInstallments - this.paidInstallments);
});

schemeEnrollmentSchema.virtual('isOverdue').get(function () {
  if (this.status !== 'active') return false;
  return this.nextDueDate && new Date() > this.nextDueDate;
});

schemeEnrollmentSchema.virtual('daysOverdue').get(function () {
  if (!this.isOverdue) return 0;
  const diff = new Date() - new Date(this.nextDueDate);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// ── Soft delete middleware ─────────────────────
schemeEnrollmentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ── Instance Methods ──────────────────────────
schemeEnrollmentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

schemeEnrollmentSchema.methods.generateSchedule = function () {
  const schedule = [];
  let dueDate    = new Date(this.startDate);

  for (let i = 1; i <= this.totalInstallments; i++) {
    // Move to next due date
    if (i > 1) {
      if (this.frequency === 'monthly') {
        dueDate = new Date(dueDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
      } else if (this.frequency === 'weekly') {
        dueDate = new Date(dueDate);
        dueDate.setDate(dueDate.getDate() + 7);
      }
    }

    schedule.push({
      installmentNumber: i,
      dueDate:           new Date(dueDate),
      amount:            this.installmentAmount,
      status:            'pending',
      paidDate:          null,
      paidAmount:        0,
      penaltyAmount:     0,
    });
  }

  this.schedule = schedule;
  return schedule;
};

schemeEnrollmentSchema.methods.recordPayment = function (paymentData) {
  const { amount, paymentId, paidDate, installmentIndex } = paymentData;

  let idx = installmentIndex;

  // Find the first pending/overdue installment if index not given
  if (idx === undefined || idx === null) {
    idx = this.schedule.findIndex(s => s.status === 'pending' || s.status === 'overdue');
  }

  if (idx === -1 || idx >= this.schedule.length) {
    throw new Error('No pending installment found');
  }

  const installment      = this.schedule[idx];
  installment.status     = 'paid';
  installment.paidDate   = paidDate || new Date();
  installment.paidAmount = amount;
  installment.paymentId  = paymentId;

  this.paidInstallments  += 1;
  this.totalPaidAmount   += amount;

  // Update next due date
  const nextPending = this.schedule.find(s => s.status === 'pending' || s.status === 'overdue');
  this.nextDueDate  = nextPending ? nextPending.dueDate : null;

  // Check completion
  if (this.paidInstallments >= this.totalInstallments) {
    this.status         = 'matured';
    this.actualEndDate  = new Date();
    this.maturityDate   = new Date();
  }

  return this.save();
};

schemeEnrollmentSchema.methods.calculateCurrentMaturity = function (schemeBonus) {
  const paidAmount   = this.totalPaidAmount;
  let   bonusAmount  = 0;

  if (schemeBonus?.hasBonus && this.paidInstallments === this.totalInstallments) {
    if (schemeBonus.bonusType === 'percentage') {
      bonusAmount = (paidAmount * schemeBonus.bonusValue) / 100;
    } else if (schemeBonus.bonusType === 'flat_amount') {
      bonusAmount = schemeBonus.bonusValue;
    }
  }

  return {
    paidAmount,
    bonusAmount,
    totalMaturityValue: paidAmount + bonusAmount,
  };
};

// ── Static Methods ────────────────────────────
schemeEnrollmentSchema.statics.generateEnrollmentNumber = async function (shopId, schemeCode) {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix      = `ENR-${schemeCode || 'SCH'}${currentYear}`;

  const counter = await mongoose.model('Counter').findOneAndUpdate(
    { name: `enrollment_${shopId}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${String(counter.seq).padStart(5, '0')}`;
};

schemeEnrollmentSchema.statics.findByScheme = function (schemeId, options = {}) {
  return this.find({ schemeId, deletedAt: null, ...options }).sort({ createdAt: -1 });
};

schemeEnrollmentSchema.statics.findByCustomer = function (customerId, options = {}) {
  return this.find({ customerId, deletedAt: null, ...options }).sort({ createdAt: -1 });
};

schemeEnrollmentSchema.statics.findOverdue = function (shopId) {
  return this.find({
    shopId,
    status:       'active',
    nextDueDate:  { $lt: new Date() },
    deletedAt:    null,
  }).sort({ nextDueDate: 1 });
};

schemeEnrollmentSchema.statics.findDueToday = function (shopId) {
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    shopId,
    status:      'active',
    nextDueDate: { $gte: today, $lt: tomorrow },
    deletedAt:   null,
  });
};

schemeEnrollmentSchema.statics.findUpcoming = function (shopId, days = 7) {
  const now     = new Date();
  const future  = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    shopId,
    status:      'active',
    nextDueDate: { $gte: now, $lte: future },
    deletedAt:   null,
  }).sort({ nextDueDate: 1 });
};

schemeEnrollmentSchema.statics.findMaturingSoon = function (shopId, days = 30) {
  const now    = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    shopId,
    status:       'active',
    expectedEndDate: { $gte: now, $lte: future },
    deletedAt:    null,
  }).sort({ expectedEndDate: 1 });
};

export default mongoose.model('SchemeEnrollment', schemeEnrollmentSchema);