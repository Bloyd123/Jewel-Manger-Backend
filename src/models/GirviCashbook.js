import mongoose from 'mongoose';

const girviCashbookSchema = new mongoose.Schema(
  {
    // ── Identification ──────────────────────────────────────────────────────────
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
    entryNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    entryDate: {
      type: Date,
      required: [true, 'Entry date is required'],
      index: true,
    },

    // ── Entry Type ──────────────────────────────────────────────────────────────
    entryType: {
      type: String,
      enum: [
        'girvi_jama',          // new pledge → cash OUT to customer
        'interest_received',   // interest payment → cash IN
        'principal_received',  // principal repayment → cash IN
        'release_received',    // full release payment → cash IN
        'discount_given',      // discount given → adjustment OUT
        'transfer_out',        // cash given to party on transfer → cash OUT
        'transfer_in',         // cash received from party → cash IN
        'transfer_return_in',  // party returned item, we paid → cash OUT
        'transfer_return_out', // we received back, party paid → cash IN
      ],
      required: [true, 'Entry type is required'],
      index: true,
    },

    // ── Flow ────────────────────────────────────────────────────────────────────
    flowType: {
      type: String,
      enum: ['inflow', 'outflow'],
      required: true,
      index: true,
      comment: 'inflow = cash received, outflow = cash given',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      required: true,
      default: 'cash',
    },
    transactionReference: {
      type: String,
      trim: true,
      comment: 'UPI ID, cheque number, bank ref etc.',
    },

    // ── Breakdown (for release/payment entries) ─────────────────────────────────
    breakdown: {
      principalAmount:    { type: Number, default: 0 },
      interestAmount:     { type: Number, default: 0 },
      discountAmount:     { type: Number, default: 0 },
      commissionAmount:   { type: Number, default: 0 },
      netAmount:          { type: Number, default: 0 },
    },

    // ── References ──────────────────────────────────────────────────────────────
    girviId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Girvi',
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GirviPayment',
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GirviTransfer',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },

    // ── Girvi Reference Info (for quick display without populate) ───────────────
    girviNumber:   { type: String, trim: true },
    customerName:  { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    // ── Balance ─────────────────────────────────────────────────────────────────
    openingBalance: {
      type: Number,
      default: 0,
      comment: 'Cashbook balance before this entry',
    },
    closingBalance: {
      type: Number,
      default: 0,
      comment: 'Cashbook balance after this entry',
    },

    // ── Audit ───────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks:   { type: String, trim: true, maxlength: 500 },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
girviCashbookSchema.index({ organizationId: 1, shopId: 1, entryNumber: 1 }, { unique: true });
girviCashbookSchema.index({ shopId: 1, entryDate: -1 });
girviCashbookSchema.index({ shopId: 1, entryType: 1, entryDate: -1 });
girviCashbookSchema.index({ shopId: 1, flowType: 1, entryDate: -1 });
girviCashbookSchema.index({ shopId: 1, customerId: 1, entryDate: -1 });

// ─── Soft Delete Middleware ────────────────────────────────────────────────────
girviCashbookSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─── Static Methods ────────────────────────────────────────────────────────────
girviCashbookSchema.statics.generateEntryNumber = async function (shopId, prefix = 'GRVCB') {
  let number = 1;
  let entryNumber;

  do {
    entryNumber = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await this.findOne({ shopId, entryNumber }).setOptions({ includeDeleted: true });
    if (!existing) break;
    number++;
  } while (true);

  return entryNumber;
};

girviCashbookSchema.statics.getLatestBalance = async function (shopId) {
  const latest = await this.findOne({ shopId, deletedAt: null })
    .sort({ entryDate: -1, createdAt: -1 })
    .select('closingBalance')
    .lean();
  return latest?.closingBalance || 0;
};

girviCashbookSchema.statics.getDailySummary = async function (shopId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await this.aggregate([
    {
      $match: {
        shopId:     new mongoose.Types.ObjectId(shopId),
        entryDate:  { $gte: startOfDay, $lte: endOfDay },
        deletedAt:  null,
      },
    },
    {
      $group: {
        _id:              null,
        totalInflow:      { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
        totalOutflow:     { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
        totalInterest:    { $sum: '$breakdown.interestAmount' },
        totalPrincipal:   { $sum: '$breakdown.principalAmount' },
        totalDiscount:    { $sum: '$breakdown.discountAmount' },
        entryCount:       { $sum: 1 },
        newGirviCount: {
          $sum: { $cond: [{ $eq: ['$entryType', 'girvi_jama'] }, 1, 0] },
        },
        releaseCount: {
          $sum: { $cond: [{ $eq: ['$entryType', 'release_received'] }, 1, 0] },
        },
      },
    },
  ]);

  return result[0] || {
    totalInflow:    0,
    totalOutflow:   0,
    totalInterest:  0,
    totalPrincipal: 0,
    totalDiscount:  0,
    entryCount:     0,
    newGirviCount:  0,
    releaseCount:   0,
  };
};

girviCashbookSchema.statics.getMonthlySummary = async function (shopId, year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

  const result = await this.aggregate([
    {
      $match: {
        shopId:    new mongoose.Types.ObjectId(shopId),
        entryDate: { $gte: startOfMonth, $lte: endOfMonth },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id:           { $dayOfMonth: '$entryDate' },
        totalInflow:   { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
        totalOutflow:  { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
        totalInterest: { $sum: '$breakdown.interestAmount' },
        entryCount:    { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result;
};

girviCashbookSchema.statics.createEntry = async function ({
  shopId,
  organizationId,
  entryType,
  flowType,
  amount,
  paymentMode,
  transactionReference,
  breakdown,
  girviId,
  paymentId,
  transferId,
  customerId,
  girviNumber,
  customerName,
  customerPhone,
  entryDate,
  createdBy,
  remarks,
}) {
  const entryNumber    = await this.generateEntryNumber(shopId);
  const openingBalance = await this.getLatestBalance(shopId);
  const closingBalance = flowType === 'inflow'
    ? openingBalance + amount
    : openingBalance - amount;

  return this.create({
    organizationId,
    shopId,
    entryNumber,
    entryDate:   entryDate || new Date(),
    entryType,
    flowType,
    amount,
    paymentMode,
    transactionReference,
    breakdown:   breakdown || {},
    girviId,
    paymentId,
    transferId,
    customerId,
    girviNumber,
    customerName,
    customerPhone,
    openingBalance,
    closingBalance,
    createdBy,
    remarks,
  });
};

// ─── Instance Methods ──────────────────────────────────────────────────────────
girviCashbookSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('GirviCashbook', girviCashbookSchema);