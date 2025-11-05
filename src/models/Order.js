import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    // Multi-tenant
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: [true, 'Shop ID is required'],
      index: true
    },

    // Order Identification
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true
    },
    customerDetails: {
      customerName: String,
      customerCode: String,
      phone: String,
      email: String,
      address: String
    },

    // Order Type
    orderType: {
      type: String,
      enum: ['custom_order', 'repair', 'alteration', 'engraving', 'polishing', 'stone_setting', 'resizing', 'certification'],
      required: true,
      index: true
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true
    },

    // Items/Services
    items: [{
      itemType: {
        type: String,
        enum: ['new_product', 'existing_product', 'service'],
        required: true
      },
      
      // Product Details (for custom orders)
      productName: {
        type: String,
        required: true
      },
      productCode: String,
      category: String,
      
      // Design Details
      design: {
        designNumber: String,
        designUrl: String,
        designDescription: String,
        referenceImages: [String]
      },
      
      // Metal Details
      metalType: {
        type: String,
        enum: ['gold', 'silver', 'platinum', 'diamond', 'mixed'],
        required: true
      },
      purity: String,
      
      // Weight (for custom orders)
      estimatedWeight: {
        type: Number,
        default: 0,
        min: 0
      },
      actualWeight: {
        type: Number,
        default: 0,
        min: 0
      },
      weightUnit: {
        type: String,
        enum: ['gram', 'kg', 'tola'],
        default: 'gram'
      },
      
      // Stone Details
      stones: [{
        stoneType: {
          type: String,
          enum: ['diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'other']
        },
        quantity: Number,
        weight: Number,
        quality: String,
        shape: String,
        size: String,
        color: String,
        clarity: String,
        estimatedValue: Number
      }],
      
      // Service Details (for repairs/services)
      serviceDetails: {
        serviceType: String,
        issueDescription: String,
        workRequired: String,
        conditionBefore: String,
        conditionPhotos: [String]
      },
      
      // Pricing
      estimatedCost: {
        metalCost: { type: Number, default: 0 },
        stoneCost: { type: Number, default: 0 },
        makingCharges: { type: Number, default: 0 },
        labourCharges: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 }
      },
      
      actualCost: {
        metalCost: { type: Number, default: 0 },
        stoneCost: { type: Number, default: 0 },
        makingCharges: { type: Number, default: 0 },
        labourCharges: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 }
      },
      
      // Status
      itemStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'pending'
      },
      
      // Quantity
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      
      // Notes
      notes: String,
      internalNotes: String
    }],

    // Dates & Timeline
    timeline: {
      estimatedStartDate: Date,
      actualStartDate: Date,
      estimatedCompletionDate: {
        type: Date,
        required: true
      },
      actualCompletionDate: Date,
      estimatedDuration: Number, // in days
      actualDuration: Number // in days
    },

    // Financial Details
    financials: {
      estimatedTotal: {
        type: Number,
        default: 0,
        min: 0
      },
      actualTotal: {
        type: Number,
        default: 0,
        min: 0
      },
      advancePaid: {
        type: Number,
        default: 0,
        min: 0
      },
      balanceAmount: {
        type: Number,
        default: 0
      },
      discount: {
        type: {
          type: String,
          enum: ['percentage', 'flat', 'none'],
          default: 'none'
        },
        value: {
          type: Number,
          default: 0,
          min: 0
        },
        amount: {
          type: Number,
          default: 0,
          min: 0
        }
      },
      tax: {
        gstPercentage: {
          type: Number,
          default: 3
        },
        gstAmount: {
          type: Number,
          default: 0
        }
      },
      grandTotal: {
        type: Number,
        default: 0
      }
    },

    // Payment Details
    payment: {
      paymentStatus: {
        type: String,
        enum: ['pending', 'advance_paid', 'partially_paid', 'paid'],
        default: 'pending',
        index: true
      },
      payments: [{
        amount: Number,
        paymentMode: String,
        paymentDate: Date,
        transactionId: String,
        notes: String,
        receivedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }]
    },

    // Assignment
    assignment: {
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: Date,
      workstation: String,
      artisan: {
        name: String,
        contactNumber: String,
        specialization: String
      }
    },

    // Status & Progress
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'in_progress', 'on_hold', 'quality_check', 'ready', 'delivered', 'completed', 'cancelled'],
      default: 'draft',
      index: true
    },

    // Progress Updates
    progressUpdates: [{
      updateDate: {
        type: Date,
        default: Date.now
      },
      status: String,
      description: String,
      photos: [String],
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],

    // Quality Check
    qualityCheck: {
      isRequired: {
        type: Boolean,
        default: true
      },
      status: {
        type: String,
        enum: ['pending', 'passed', 'failed', 'not_required'],
        default: 'pending'
      },
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      checkedAt: Date,
      remarks: String,
      issues: [String],
      photos: [String]
    },

    // Delivery Details
    delivery: {
      deliveryType: {
        type: String,
        enum: ['pickup', 'home_delivery', 'courier'],
        default: 'pickup'
      },
      deliveryDate: Date,
      deliveryAddress: String,
      deliveredTo: String,
      deliveredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deliveredAt: Date,
      receivedBy: String,
      receivedSignature: String,
      courierDetails: {
        courierName: String,
        trackingNumber: String,
        awbNumber: String
      }
    },

    // Customer Feedback
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String,
      feedbackDate: Date
    },

    // Documents
    documents: [{
      documentType: {
        type: String,
        enum: ['estimate', 'receipt', 'delivery_note', 'design', 'certificate', 'photo', 'other']
      },
      documentUrl: String,
      documentNumber: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Linked Sale (when order is completed and billed)
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      default: null
    },

    // Cancellation Details
    cancellation: {
      isCancelled: {
        type: Boolean,
        default: false
      },
      cancelledAt: Date,
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cancellationReason: String,
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: ['pending', 'completed', 'not_applicable'],
        default: 'not_applicable'
      }
    },

    // Approval
    approval: {
      requiresApproval: {
        type: Boolean,
        default: false
      },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      rejectionReason: String
    },

    // Notes & Tags
    notes: {
      type: String,
      maxlength: 1000
    },
    internalNotes: String,
    specialInstructions: String,
    tags: [String],

    // Reminder
    reminder: {
      hasReminder: {
        type: Boolean,
        default: false
      },
      reminderDate: Date,
      reminderSent: {
        type: Boolean,
        default: false
      }
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
orderSchema.index({ organizationId: 1, shopId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ shopId: 1, status: 1 });
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ 'timeline.estimatedCompletionDate': 1 });
orderSchema.index({ 'assignment.assignedTo': 1 });
orderSchema.index({ priority: 1, status: 1 });

// Virtuals
orderSchema.virtual('totalItems').get(function() {
  return this.items.length;
});

orderSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'delivered' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.timeline.estimatedCompletionDate;
});

orderSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const completionDate = this.timeline.estimatedCompletionDate;
  const diffTime = completionDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
orderSchema.pre('save', function(next) {
  // Calculate estimated total
  this.financials.estimatedTotal = this.items.reduce((sum, item) => 
    sum + (item.estimatedCost.totalCost * item.quantity), 0);
  
  // Calculate actual total
  this.financials.actualTotal = this.items.reduce((sum, item) => 
    sum + (item.actualCost.totalCost * item.quantity), 0);
  
  // Apply discount
  const baseAmount = this.financials.actualTotal || this.financials.estimatedTotal;
  if (this.financials.discount.type === 'percentage') {
    this.financials.discount.amount = (baseAmount * this.financials.discount.value) / 100;
  } else if (this.financials.discount.type === 'flat') {
    this.financials.discount.amount = this.financials.discount.value;
  }
  
  const afterDiscount = baseAmount - this.financials.discount.amount;
  
  // Calculate GST
  this.financials.tax.gstAmount = (afterDiscount * this.financials.tax.gstPercentage) / 100;
  
  // Calculate grand total
  this.financials.grandTotal = afterDiscount + this.financials.tax.gstAmount;
  
  // Calculate balance
  this.financials.balanceAmount = this.financials.grandTotal - this.financials.advancePaid;
  
  // Update payment status
  if (this.financials.advancePaid === 0) {
    this.payment.paymentStatus = 'pending';
  } else if (this.financials.advancePaid >= this.financials.grandTotal) {
    this.payment.paymentStatus = 'paid';
  } else if (this.financials.advancePaid > 0) {
    this.payment.paymentStatus = this.financials.advancePaid < this.financials.grandTotal / 2 
      ? 'advance_paid' : 'partially_paid';
  }
  
  // Calculate actual duration if completed
  if (this.timeline.actualCompletionDate && this.timeline.actualStartDate) {
    const diffTime = this.timeline.actualCompletionDate - this.timeline.actualStartDate;
    this.timeline.actualDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  next();
});

// Soft delete middleware
orderSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
orderSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

orderSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

orderSchema.methods.addPayment = function(paymentData) {
  this.payment.payments.push(paymentData);
  this.financials.advancePaid += paymentData.amount;
  return this.save();
};

orderSchema.methods.assignTo = function(userId, assignedBy) {
  this.assignment.assignedTo = userId;
  this.assignment.assignedBy = assignedBy;
  this.assignment.assignedAt = new Date();
  return this.save();
};

orderSchema.methods.addProgressUpdate = function(updateData) {
  this.progressUpdates.push(updateData);
  if (updateData.status) {
    this.status = updateData.status;
  }
  return this.save();
};

orderSchema.methods.startWork = function() {
  this.status = 'in_progress';
  this.timeline.actualStartDate = new Date();
  return this.save();
};

orderSchema.methods.markAsReady = function() {
  this.status = 'ready';
  return this.save();
};

orderSchema.methods.markAsDelivered = function(deliveryData) {
  this.status = 'delivered';
  Object.assign(this.delivery, deliveryData);
  this.delivery.deliveredAt = new Date();
  return this.save();
};

orderSchema.methods.complete = function() {
  this.status = 'completed';
  this.timeline.actualCompletionDate = new Date();
  return this.save();
};

orderSchema.methods.cancel = function(cancelData) {
  this.status = 'cancelled';
  this.cancellation.isCancelled = true;
  this.cancellation.cancelledAt = new Date();
  Object.assign(this.cancellation, cancelData);
  return this.save();
};

orderSchema.methods.performQualityCheck = function(checkData) {
  Object.assign(this.qualityCheck, checkData);
  this.qualityCheck.checkedAt = new Date();
  
  if (checkData.status === 'passed') {
    this.status = 'ready';
  } else if (checkData.status === 'failed') {
    this.status = 'in_progress';
  }
  
  return this.save();
};

orderSchema.methods.addFeedback = function(rating, review) {
  this.feedback.rating = rating;
  this.feedback.review = review;
  this.feedback.feedbackDate = new Date();
  return this.save();
};

orderSchema.methods.linkSale = function(saleId) {
  this.saleId = saleId;
  this.status = 'completed';
  return this.save();
};

// Static Methods
orderSchema.statics.generateOrderNumber = async function(shopId, orderType, prefix = 'ORD') {
  const typePrefix = {
    'custom_order': 'CO',
    'repair': 'REP',
    'alteration': 'ALT',
    'engraving': 'ENG',
    'polishing': 'POL',
    'stone_setting': 'SS',
    'resizing': 'RSZ',
    'certification': 'CRT'
  };
  
  const finalPrefix = typePrefix[orderType] || prefix;
  const currentYear = new Date().getFullYear().toString().slice(-2);
  
  let number = 1;
  const lastOrder = await this.findOne({ shopId, orderType })
    .sort({ orderNumber: -1 })
    .select('orderNumber');
  
  if (lastOrder && lastOrder.orderNumber) {
    const lastNumber = parseInt(lastOrder.orderNumber.split('-').pop());
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }
  
  return `${finalPrefix}-${currentYear}-${String(number).padStart(5, '0')}`;
};

orderSchema.statics.findByShop = function(shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options }).sort({ orderDate: -1 });
};

orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  return this.find({ customerId, deletedAt: null, ...options }).sort({ orderDate: -1 });
};

orderSchema.statics.findByStatus = function(shopId, status) {
  return this.find({ shopId, status, deletedAt: null }).sort({ orderDate: -1 });
};

orderSchema.statics.findByOrderType = function(shopId, orderType) {
  return this.find({ shopId, orderType, deletedAt: null }).sort({ orderDate: -1 });
};

orderSchema.statics.findOverdue = function(shopId) {
  return this.find({
    shopId,
    'timeline.estimatedCompletionDate': { $lt: new Date() },
    status: { $in: ['confirmed', 'in_progress', 'on_hold'] },
    deletedAt: null
  }).sort({ 'timeline.estimatedCompletionDate': 1 });
};

orderSchema.statics.findDueSoon = function(shopId, days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    shopId,
    'timeline.estimatedCompletionDate': { $lte: futureDate, $gte: new Date() },
    status: { $in: ['confirmed', 'in_progress'] },
    deletedAt: null
  }).sort({ 'timeline.estimatedCompletionDate': 1 });
};

orderSchema.statics.findByAssignedUser = function(userId) {
  return this.find({
    'assignment.assignedTo': userId,
    status: { $in: ['confirmed', 'in_progress', 'quality_check'] },
    deletedAt: null
  }).sort({ 'timeline.estimatedCompletionDate': 1 });
};

orderSchema.statics.findByPriority = function(shopId, priority) {
  return this.find({
    shopId,
    priority,
    status: { $nin: ['completed', 'delivered', 'cancelled'] },
    deletedAt: null
  }).sort({ 'timeline.estimatedCompletionDate': 1 });
};

export default mongoose.model('Order', orderSchema);