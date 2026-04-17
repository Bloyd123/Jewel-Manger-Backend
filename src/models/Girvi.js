import mongoose from 'mongoose';

// ─── Item Sub-Schema ───────────────────────────────────────────────────────────
const girviItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['gold', 'silver', 'diamond', 'platinum', 'other'],
      required: [true, 'Item type is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },

    // ── Weight Details ──────────────────────────────────────────────────────────
    grossWeight: {
      type: Number,
      required: [true, 'Gross weight is required'],
      min: [0, 'Gross weight cannot be negative'],
    },
    lessWeight: {
      type: Number,
      default: 0,
      min: [0, 'Less weight cannot be negative'],
    },
    netWeight: {
      type: Number,
      min: [0, 'Net weight cannot be negative'],
    },

    // ── Purity & Rate ───────────────────────────────────────────────────────────
    tunch: {
      type: Number,
      min: [0, 'Tunch cannot be negative'],
      max: [100, 'Tunch cannot exceed 100'],
      comment: 'Purity percentage e.g. 91.6 for 22K, 58.5 for 14K',
    },
    purity: {
      type: String,
      trim: true,
      comment: 'e.g. 22K, 18K, 14K, 92.5, 999',
    },
    ratePerGram: {
      type: Number,
      min: [0, 'Rate per gram cannot be negative'],
      comment: 'Today market rate per gram in INR',
    },

    // ── Value ───────────────────────────────────────────────────────────────────
    approxValue: {
      type: Number,
      min: [0, 'Approx value cannot be negative'],
      comment: 'Auto calculated: netWeight × (tunch/100) × ratePerGram',
    },
    userGivenValue: {
      type: Number,
      min: [0, 'User given value cannot be negative'],
      comment: 'Override value given by user if different from calculated',
    },
    finalValue: {
      type: Number,
      min: [0, 'Final value cannot be negative'],
      comment: 'userGivenValue if provided, else approxValue',
    },

    condition: {
      type: String,
      enum: ['good', 'fair', 'poor'],
      default: 'good',
    },
  },
  { _id: true }
);

// ─── Document Sub-Schema ───────────────────────────────────────────────────────
const girviDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ['girvi_slip', 'id_proof', 'photo', 'other'],
      required: true,
    },
    documentUrl: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Main Girvi Schema ─────────────────────────────────────────────────────────
const girviSchema = new mongoose.Schema(
  {
    // ── Identification ──────────────────────────────────────────────────────────
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
    girviNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },

    // ── Status ──────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'active',
        'released',
        'transferred',
        'partial_released',
        'overdue',
        'auctioned',
      ],
      default: 'active',
      index: true,
    },

    // ── Pledge Items ────────────────────────────────────────────────────────────
    items: {
      type: [girviItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: val => val.length > 0,
        message: 'At least one item is required',
      },
    },

    // ── Total Items Summary (calculated) ────────────────────────────────────────
    totalGrossWeight: { type: Number, default: 0 },
    totalNetWeight:   { type: Number, default: 0 },
    totalApproxValue: { type: Number, default: 0 },

    // ── Financial Details ───────────────────────────────────────────────────────
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [1, 'Principal amount must be greater than 0'],
    },
    loanToValueRatio: {
      type: Number,
      min: 0,
      max: 100,
      comment: 'Percentage of total approx value given as loan',
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
      comment: 'Percentage per month',
    },
    interestType: {
      type: String,
      enum: ['simple', 'compound'],
      default: 'simple',
    },
    calculationBasis: {
      type: String,
      enum: ['monthly', 'daily'],
      default: 'monthly',
    },
    girviDate: {
      type: Date,
      required: [true, 'Girvi date is required'],
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    gracePeriodDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Running Balance ─────────────────────────────────────────────────────────
    totalPrincipalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInterestPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDiscountGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingPrincipal: {
      type: Number,
      default: 0,
      min: 0,
    },
    accruedInterest: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastInterestCalcDate: {
      type: Date,
    },
    totalAmountDue: {
      type: Number,
      default: 0,
      comment: 'outstandingPrincipal + accruedInterest',
    },

    // ── Transfer Details ────────────────────────────────────────────────────────
    isTransferred: {
      type: Boolean,
      default: false,
    },
    currentHolderType: {
      type: String,
      enum: ['shop', 'external_party'],
      default: 'shop',
    },
    transferredToParty: {
      name:    { type: String, trim: true },
      phone:   { type: String, trim: true },
      address: { type: String, trim: true },
    },
    transferInterestRate: {
      type: Number,
      min: 0,
      comment: 'Interest rate charged by the party we transferred to',
    },
    transferInterestType: {
      type: String,
      enum: ['simple', 'compound'],
    },

    // ── Release Summary ─────────────────────────────────────────────────────────
    releaseDate: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    releaseNotes: String,

    // Release financials (filled when released)
    releaseSummary: {
      totalItemsApproxValue:    { type: Number, default: 0 },
      totalPrincipal:           { type: Number, default: 0 },
      totalInterestAccrued:     { type: Number, default: 0 },
      totalInterestReceived:    { type: Number, default: 0 },
      totalPrincipalReceived:   { type: Number, default: 0 },
      totalDiscountGiven:       { type: Number, default: 0 },
      netAmountReceived:        { type: Number, default: 0 },
      releaseInterestType:      { type: String, enum: ['simple', 'compound'] },
      releasePaymentMode: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      },
      releaseRemarks: String,
    },

    // ── Document & Notes ────────────────────────────────────────────────────────
    girviSlipNumber: {
      type: String,
      trim: true,
    },
    witnessName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: {
      type: String,
      maxlength: 1000,
    },
    documents: [girviDocumentSchema],

    // ── Audit ───────────────────────────────────────────────────────────────────
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
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
girviSchema.index({ organizationId: 1, shopId: 1, girviNumber: 1 }, { unique: true });
girviSchema.index({ shopId: 1, status: 1 });
girviSchema.index({ shopId: 1, customerId: 1 });
girviSchema.index({ shopId: 1, girviDate: -1 });
girviSchema.index({ shopId: 1, dueDate: 1, status: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────────────
girviSchema.virtual('isOverdue').get(function () {
  if (this.status !== 'active') return false;
  const effectiveDueDate = this.dueDate
    ? new Date(this.dueDate.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000)
    : null;
  return effectiveDueDate ? new Date() > effectiveDueDate : false;
});

girviSchema.virtual('daysElapsed').get(function () {
  const from = this.girviDate || this.createdAt;
  return Math.floor((new Date() - new Date(from)) / (1000 * 60 * 60 * 24));
});

girviSchema.virtual('payments', {
  ref:          'GirviPayment',
  localField:   '_id',
  foreignField: 'girviId',
});

girviSchema.virtual('transfers', {
  ref:          'GirviTransfer',
  localField:   '_id',
  foreignField: 'girviId',
});

// ─── Pre-save Middleware ───────────────────────────────────────────────────────
girviSchema.pre('save', function (next) {
  // Calculate item derived fields
  this.items.forEach(item => {
    // Net weight
    item.netWeight = Math.max(0, (item.grossWeight || 0) - (item.lessWeight || 0));

    // Approx value: netWeight × (tunch/100) × ratePerGram
    if (item.netWeight && item.tunch && item.ratePerGram) {
      item.approxValue = parseFloat(
        (item.netWeight * (item.tunch / 100) * item.ratePerGram).toFixed(2)
      );
    }

    // Final value: user given or calculated
    item.finalValue = item.userGivenValue || item.approxValue || 0;
  });

  // Total summary
  this.totalGrossWeight = parseFloat(
    this.items.reduce((sum, i) => sum + (i.grossWeight || 0), 0).toFixed(3)
  );
  this.totalNetWeight = parseFloat(
    this.items.reduce((sum, i) => sum + (i.netWeight || 0), 0).toFixed(3)
  );
  this.totalApproxValue = parseFloat(
    this.items.reduce((sum, i) => sum + (i.finalValue || 0), 0).toFixed(2)
  );

  // Outstanding principal
  this.outstandingPrincipal = Math.max(
    0,
    (this.principalAmount || 0) - (this.totalPrincipalPaid || 0)
  );

  // Total amount due
  this.totalAmountDue = parseFloat(
    (this.outstandingPrincipal + (this.accruedInterest || 0)).toFixed(2)
  );

  next();
});

// ─── Soft Delete Middleware ────────────────────────────────────────────────────
girviSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
girviSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

girviSchema.methods.calculateInterest = function (toDate = new Date()) {
  const fromDate   = this.lastInterestCalcDate || this.girviDate;
  const principal  = this.outstandingPrincipal || this.principalAmount;
  const rate       = this.interestRate; // per month
  const days       = Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24));
  const months     = days / 30;

  let interest = 0;
  if (this.interestType === 'simple') {
    interest = principal * (rate / 100) * months;
  } else {
    // Compound
    interest = principal * (Math.pow(1 + rate / 100, months) - 1);
  }

  return parseFloat(Math.max(0, interest).toFixed(2));
};

// ─── Static Methods ────────────────────────────────────────────────────────────
girviSchema.statics.generateGirviNumber = async function (shopId, prefix = 'GRV') {
  let number = 1;
  let girviNumber;

  do {
    girviNumber = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await this.findOne({ shopId, girviNumber }).setOptions({ includeDeleted: true });
    if (!existing) break;
    number++;
  } while (true);

  return girviNumber;
};

girviSchema.statics.findByShop = function (shopId, status = null) {
  const query = { shopId, deletedAt: null };
  if (status) query.status = status;
  return this.find(query);
};

girviSchema.statics.findOverdue = function (shopId) {
  return this.find({
    shopId,
    status:  'active',
    dueDate: { $lt: new Date() },
    deletedAt: null,
  });
};

girviSchema.statics.findByCustomer = function (customerId, shopId) {
  return this.find({ customerId, shopId, deletedAt: null });
};

export default mongoose.model('Girvi', girviSchema);