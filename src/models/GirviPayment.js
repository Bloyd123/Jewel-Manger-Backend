import mongoose from 'mongoose';

const girviPaymentSchema = new mongoose.Schema(
  {
    // ── Identification ──────────────────────────────────────────────────────────
    girviId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Girvi',
      required: [true, 'Girvi ID is required'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // ── Payment Type ────────────────────────────────────────────────────────────
    paymentType: {
      type: String,
      enum: [
        'interest_only',       // sirf interest pay kiya
        'principal_partial',   // kuch principal wapas
        'principal_full',      // poora principal
        'interest_principal',  // dono saath
        'release_payment',     // final release
      ],
      required: [true, 'Payment type is required'],
    },

    // ── Interest Calculation ────────────────────────────────────────────────────
    interestType: {
      type: String,
      enum: ['simple', 'compound'],
      required: [true, 'Interest type is required'],
      comment: 'Chosen by user at time of payment',
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Rate used for this payment calculation (% per month)',
    },
    interestFrom: {
      type: Date,
      comment: 'Interest calculation start date',
    },
    interestTo: {
      type: Date,
      comment: 'Interest calculation end date',
    },
    interestDays: {
      type: Number,
      min: 0,
      comment: 'Total days for interest calculation',
    },
    interestCalculated: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'System calculated interest amount',
    },
    interestReceived: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Actual interest received (user editable)',
    },

    // ── Payment Breakdown ───────────────────────────────────────────────────────
    principalReceived: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Actual principal amount received',
    },
    discountGiven: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Discount given to customer on this payment',
    },
    netAmountReceived: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'interestReceived + principalReceived - discountGiven',
    },

    // ── Payment Details ─────────────────────────────────────────────────────────
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      required: [true, 'Payment mode is required'],
      default: 'cash',
    },
    transactionReference: {
      type: String,
      trim: true,
      comment: 'UPI ID, cheque number, bank reference etc.',
    },

    // ── Balance Snapshot (at time of payment) ───────────────────────────────────
    principalBefore: {
      type: Number,
      default: 0,
      comment: 'Outstanding principal before this payment',
    },
    principalAfter: {
      type: Number,
      default: 0,
      comment: 'Outstanding principal after this payment',
    },
    outstandingBefore: {
      type: Number,
      default: 0,
      comment: 'Total outstanding (principal + interest) before payment',
    },
    outstandingAfter: {
      type: Number,
      default: 0,
      comment: 'Total outstanding after payment',
    },

    // ── Audit ───────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
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
girviPaymentSchema.index({ organizationId: 1, shopId: 1, receiptNumber: 1 }, { unique: true });
girviPaymentSchema.index({ girviId: 1, paymentDate: -1 });
girviPaymentSchema.index({ shopId: 1, paymentDate: -1 });
girviPaymentSchema.index({ shopId: 1, customerId: 1, paymentDate: -1 });

// ─── Pre-save Middleware ───────────────────────────────────────────────────────
girviPaymentSchema.pre('save', function (next) {
  // Calculate interest days
  if (this.interestFrom && this.interestTo) {
    this.interestDays = Math.floor(
      (new Date(this.interestTo) - new Date(this.interestFrom)) / (1000 * 60 * 60 * 24)
    );
  }

  // Net amount received
  this.netAmountReceived = parseFloat(
    Math.max(
      0,
      (this.interestReceived || 0) +
      (this.principalReceived || 0) -
      (this.discountGiven || 0)
    ).toFixed(2)
  );

  next();
});

// ─── Soft Delete Middleware ────────────────────────────────────────────────────
girviPaymentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─── Static Methods ────────────────────────────────────────────────────────────
girviPaymentSchema.statics.generateReceiptNumber = async function (shopId, prefix = 'GRVPAY') {
  let number = 1;
  let receiptNumber;

  do {
    receiptNumber = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await this.findOne({ shopId, receiptNumber }).setOptions({ includeDeleted: true });
    if (!existing) break;
    number++;
  } while (true);

  return receiptNumber;
};

girviPaymentSchema.statics.findByGirvi = function (girviId) {
  return this.find({ girviId, deletedAt: null }).sort({ paymentDate: -1 });
};

girviPaymentSchema.statics.getPaymentSummary = async function (girviId) {
  const result = await this.aggregate([
    { $match: { girviId: new mongoose.Types.ObjectId(girviId), deletedAt: null } },
    {
      $group: {
        _id:                    null,
        totalInterestReceived:  { $sum: '$interestReceived' },
        totalPrincipalReceived: { $sum: '$principalReceived' },
        totalDiscountGiven:     { $sum: '$discountGiven' },
        totalNetReceived:       { $sum: '$netAmountReceived' },
        paymentCount:           { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    totalInterestReceived:  0,
    totalPrincipalReceived: 0,
    totalDiscountGiven:     0,
    totalNetReceived:       0,
    paymentCount:           0,
  };
};

// ─── Instance Methods ──────────────────────────────────────────────────────────
girviPaymentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('GirviPayment', girviPaymentSchema);