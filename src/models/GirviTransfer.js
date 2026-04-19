import mongoose from 'mongoose';

const itemSnapshotSchema = new mongoose.Schema(
  {
    itemName:      { type: String, trim: true },
    itemType:      { type: String, enum: ['gold', 'silver', 'diamond', 'platinum', 'other'] },
    description:   { type: String, trim: true },
    quantity:      { type: Number, default: 1 },
    grossWeight:   { type: Number, default: 0 },
    lessWeight:    { type: Number, default: 0 },
    netWeight:     { type: Number, default: 0 },
    tunch:         { type: Number },
    purity:        { type: String, trim: true },
    ratePerGram:   { type: Number },
    approxValue:   { type: Number },
    finalValue:    { type: Number },
    condition:     { type: String, enum: ['good', 'fair', 'poor'] },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['shop', 'external'],
      default: 'external',
    },
    name: {
      type: String,
      trim: true,
      required: [true, 'Party name is required'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      comment: 'Only if type is shop and another shop in system',
    },
    interestRate: {
      type: Number,
      min: 0,
      comment: 'Interest rate of this party (% per month)',
    },
    interestType: {
      type: String,
      enum: ['simple', 'compound'],
      default: 'simple',
    },
  },
  { _id: false }
);

const girviTransferSchema = new mongoose.Schema(
  {
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
    transferNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    transferType: {
      type: String,
      enum: [
        'outgoing', // hamare paas se doosri party ko
        'incoming', // doosri party se hamare paas aaya
        'return',   // transferred item wapas aaya
      ],
      required: [true, 'Transfer type is required'],
    },

    // ── Parties ─────────────────────────────────────────────────────────────────
    fromParty: {
      type: partySchema,
      required: true,
    },
    toParty: {
      type: partySchema,
      required: true,
    },

    transferDate: {
      type: Date,
      required: [true, 'Transfer date is required'],
      index: true,
    },

    // Our side
    ourPrincipalAmount:        { type: Number, default: 0, min: 0 },
    ourInterestTillTransfer:   { type: Number, default: 0, min: 0, comment: 'Hamara interest till transfer date' },
    ourInterestRate:           { type: Number, default: 0, min: 0 },
    ourInterestType:           { type: String, enum: ['simple', 'compound'], default: 'simple' },
    ourTotalDue:               { type: Number, default: 0, min: 0 },

    // Party side (doosri party kitna interest legi)
    partyPrincipalAmount:      { type: Number, default: 0, min: 0, comment: 'Amount given to the party' },
    partyInterestRate:         { type: Number, default: 0, min: 0, comment: 'Rate charged by the party we transferred to (% per month)' },
    partyInterestType:         { type: String, enum: ['simple', 'compound'], default: 'simple' },

    // Transfer settlement
    transferAmount:            { type: Number, default: 0, min: 0, comment: 'Final amount settled on transfer' },
    commission:                { type: Number, default: 0, min: 0 },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
      default: 'cash',
    },
    transactionReference: { type: String, trim: true },

    // ── Items Snapshot ──────────────────────────────────────────────────────────
    itemsSnapshot: {
      type: [itemSnapshotSchema],
      comment: 'Exact copy of girvi items at transfer time',
    },
    totalItemsValue: { type: Number, default: 0 },

    // ── Return Details ──────────────────────────────────────────────────────────
    returnDate:            Date,
    returnAmount:          { type: Number, default: 0, min: 0 },
    partyInterestCharged:  {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Interest charged by party when returning',
    },
    partyInterestDays:     { type: Number, default: 0 },
    returnReason:          { type: String, trim: true },
    returnPaymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
    },
    returnTransactionReference: { type: String, trim: true },
    returnRemarks:         { type: String, trim: true, maxlength: 500 },

    // ── Status ──────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'completed', 'returned', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // ── Audit ───────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes:     { type: String, trim: true, maxlength: 1000 },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
girviTransferSchema.index({ organizationId: 1, shopId: 1, transferNumber: 1 }, { unique: true });
girviTransferSchema.index({ girviId: 1, transferDate: -1 });
girviTransferSchema.index({ shopId: 1, status: 1 });
girviTransferSchema.index({ shopId: 1, transferDate: -1 });

// ─── Virtuals ──────────────────────────────────────────────────────────────────
girviTransferSchema.virtual('partyInterestAccrued').get(function () {
  if (!this.partyPrincipalAmount || !this.partyInterestRate) return 0;
  if (this.status !== 'completed' || this.returnDate) return 0;

  const fromDate = this.transferDate;
  const toDate   = this.returnDate || new Date();
  const days     = Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24));
  const months   = days / 30;
  const rate     = this.partyInterestRate;
  const principal = this.partyPrincipalAmount;

  let interest = 0;
  if (this.partyInterestType === 'simple') {
    interest = principal * (rate / 100) * months;
  } else {
    interest = principal * (Math.pow(1 + rate / 100, months) - 1);
  }

  return parseFloat(Math.max(0, interest).toFixed(2));
});

// ─── Soft Delete Middleware ────────────────────────────────────────────────────
girviTransferSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─── Static Methods ────────────────────────────────────────────────────────────
girviTransferSchema.statics.generateTransferNumber = async function (shopId, prefix = 'GRVTR') {
  let number = 1;
  let transferNumber;

  do {
    transferNumber = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await this.findOne({ shopId, transferNumber }).setOptions({ includeDeleted: true });
    if (!existing) break;
    number++;
  } while (true);

  return transferNumber;
};

girviTransferSchema.statics.findByGirvi = function (girviId) {
  return this.find({ girviId, deletedAt: null }).sort({ transferDate: -1 });
};

girviTransferSchema.statics.findActiveTransfers = function (shopId) {
  return this.find({
    shopId,
    status:    'completed',
    returnDate: null,
    deletedAt:  null,
  });
};

// ─── Instance Methods ──────────────────────────────────────────────────────────
girviTransferSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

girviTransferSchema.methods.calculatePartyInterest = function (toDate = new Date()) {
  if (!this.partyPrincipalAmount || !this.partyInterestRate) return 0;

  const fromDate  = this.transferDate;
  const days      = Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24));
  const months    = days / 30;
  const rate      = this.partyInterestRate;
  const principal = this.partyPrincipalAmount;

  let interest = 0;
  if (this.partyInterestType === 'simple') {
    interest = principal * (rate / 100) * months;
  } else {
    interest = principal * (Math.pow(1 + rate / 100, months) - 1);
  }

  return parseFloat(Math.max(0, interest).toFixed(2));
};

export default mongoose.model('GirviTransfer', girviTransferSchema);