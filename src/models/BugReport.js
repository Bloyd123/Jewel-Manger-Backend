import mongoose from 'mongoose';

const bugReportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      comment: 'null if anonymous / not logged in',
    },
    reporterName:  { type: String, trim: true },
    reporterEmail: { type: String, trim: true, lowercase: true },
    reporterRole:  { type: String, trim: true },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Bug title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Bug description is required'],
      trim: true,
      maxlength: 5000,
    },
    stepsToReproduce: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    expectedBehavior: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    actualBehavior: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      enum: [
        'ui',           // UI/UX issue
        'functional',   // Feature not working
        'performance',  // Slow / laggy
        'data',         // Wrong data / calculation
        'crash',        // App crash / error
        'security',     // Security concern
        'other',
      ],
      default: 'functional',
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'normal', 'low'],
      default: 'normal',
    },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed', 'duplicate', 'wont_fix'],
      default: 'open',
      index: true,
    },

    pageUrl:    { type: String, trim: true },
    moduleName: { type: String, trim: true },  // e.g. 'customer', 'girvi', 'sales'
    userAgent:  { type: String, trim: true },
    appVersion: { type: String, trim: true },

    screenshots: [
      {
        url:        { type: String, required: true },
        filename:   { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    ticketNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    resolvedAt:  Date,
    resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution:  { type: String, trim: true, maxlength: 2000 },

    telegramSent: { type: Boolean, default: false },
    emailSent:    { type: Boolean, default: false },
    notifiedAt:   Date,

    adminNotes: { type: String, trim: true, maxlength: 2000 },

    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

bugReportSchema.index({ status: 1, severity: 1 });
bugReportSchema.index({ organizationId: 1, createdAt: -1 });
bugReportSchema.index({ shopId: 1, createdAt: -1 });
bugReportSchema.index({ reportedBy: 1, createdAt: -1 });

bugReportSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

bugReportSchema.statics.generateTicketNumber = async function () {
  const date   = new Date();
  const prefix = `BUG${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  let   number = 1;

  do {
    const ticket   = `${prefix}${String(number).padStart(4, '0')}`;
    const existing = await this.findOne({ ticketNumber: ticket }).setOptions({ includeDeleted: true });
    if (!existing) return ticket;
    number++;
  } while (true);
};

bugReportSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export default mongoose.model('BugReport', bugReportSchema);