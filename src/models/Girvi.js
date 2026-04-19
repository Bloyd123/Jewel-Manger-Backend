import mongoose from 'mongoose';

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
    itemStatus: {
      type: String,
      enum: ['active', 'partial_released', 'released'],
      default: 'active',
    },
    releasedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemReleaseDate: Date,
    itemPrincipalRecovered: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Principal recovered for this specific item',
    },

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

const girviSchema = new mongoose.Schema(
  {
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

    items: {
      type: [girviItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: val => val.length > 0,
        message: 'At least one item is required',
      },
    },

    totalGrossWeight: { type: Number, default: 0 },
    totalNetWeight:   { type: Number, default: 0 },
    totalApproxValue: { type: Number, default: 0 },

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
    renewals: [
      {
        renewalDate:       { type: Date, required: true },
        previousDueDate:   { type: Date },
        newDueDate:        { type: Date },
        interestPaid:      { type: Number, default: 0 },
        principalPaid:     { type: Number, default: 0 },
        discountGiven:     { type: Number, default: 0 },
        newPrincipal:      { type: Number, default: 0 },
        newInterestRate:   { type: Number },
        paymentMode:       { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque'] },
        receiptNumber:     { type: String },
        remarks:           { type: String, trim: true },
        renewedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    partialReleases: [
      {
        releaseDate:          { type: Date, required: true },
        releasedItems:        [
          {
            itemId:           mongoose.Schema.Types.ObjectId,
            itemName:         String,
            releasedQuantity: Number,
            itemValue:        Number,
          },
        ],
        interestPaid:         { type: Number, default: 0 },
        principalPaid:        { type: Number, default: 0 },
        discountGiven:        { type: Number, default: 0 },
        netAmountReceived:    { type: Number, default: 0 },
        principalBeforeRelease: { type: Number, default: 0 },
        principalAfterRelease:  { type: Number, default: 0 },
        remainingItemsValue:  { type: Number, default: 0 },
        paymentMode:          { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque'] },
        receiptNumber:        { type: String },
        remarks:              { type: String, trim: true },
        releasedBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    releaseDate: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    releaseNotes: String,

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

girviSchema.index({ organizationId: 1, shopId: 1, girviNumber: 1 }, { unique: true });
girviSchema.index({ shopId: 1, status: 1 });
girviSchema.index({ shopId: 1, customerId: 1 });
girviSchema.index({ shopId: 1, girviDate: -1 });
girviSchema.index({ shopId: 1, dueDate: 1, status: 1 });

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

girviSchema.pre('save', function (next) {
  this.items.forEach(item => {
    item.netWeight = Math.max(0, (item.grossWeight || 0) - (item.lessWeight || 0));

    if (item.netWeight && item.tunch && item.ratePerGram) {
      item.approxValue = parseFloat(
        (item.netWeight * (item.tunch / 100) * item.ratePerGram).toFixed(2)
      );
    }

    item.finalValue = item.userGivenValue || item.approxValue || 0;
  });

  this.totalGrossWeight = parseFloat(
    this.items.reduce((sum, i) => sum + (i.grossWeight || 0), 0).toFixed(3)
  );
  this.totalNetWeight = parseFloat(
    this.items.reduce((sum, i) => sum + (i.netWeight || 0), 0).toFixed(3)
  );
  this.totalApproxValue = parseFloat(
    this.items.reduce((sum, i) => sum + (i.finalValue || 0), 0).toFixed(2)
  );

  this.outstandingPrincipal = Math.max(
    0,
    (this.principalAmount || 0) - (this.totalPrincipalPaid || 0)
  );

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
    interest = principal * (Math.pow(1 + rate / 100, months) - 1);
  }

  return parseFloat(Math.max(0, interest).toFixed(2));
};
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