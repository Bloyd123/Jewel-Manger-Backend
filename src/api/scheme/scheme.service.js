// FILE: src/api/scheme/scheme.service.js
import mongoose from 'mongoose';
import Scheme           from '../../models/Scheme.js';
import SchemeEnrollment from '../../models/SchemeEnrollment.js';
import Customer         from '../../models/Customer.js';
import Payment          from '../../models/Payment.js';
import MetalRate        from '../../models/MetalRate.js';
import JewelryShop      from '../../models/Shop.js';
import User             from '../../models/User.js';
import eventLogger      from '../../utils/eventLogger.js';
import logger           from '../../utils/logger.js';
import eventBus         from '../../eventBus.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
} from '../../utils/AppError.js';

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
const findScheme = async (shopId, schemeId) => {
  const scheme = await Scheme.findOne({ _id: schemeId, shopId, deletedAt: null });
  if (!scheme) throw new NotFoundError('Scheme not found');
  return scheme;
};

const findEnrollment = async (shopId, enrollmentId) => {
  const enrollment = await SchemeEnrollment.findOne({
    _id: enrollmentId, shopId, deletedAt: null,
  });
  if (!enrollment) throw new NotFoundError('Enrollment not found');
  return enrollment;
};

// ─────────────────────────────────────────────
// 1. CREATE SCHEME
// ─────────────────────────────────────────────
export const createScheme = async (shopId, organizationId, data, userId) => {
  const schemeCode = await Scheme.generateSchemeCode(shopId);

  const scheme = await Scheme.create({
    ...data,
    shopId,
    organizationId,
    schemeCode,
    createdBy: userId,
    status:    data.status || 'draft',
    approvalStatus: 'pending',
  });

  await eventLogger.logActivity({
    userId, organizationId, shopId,
    action:      'create',
    module:      'scheme',
    description: `Created scheme: ${scheme.schemeName} (${schemeCode})`,
    level:       'info',
    status:      'success',
    metadata:    { schemeId: scheme._id, schemeCode },
  });

  return scheme;
};

// ─────────────────────────────────────────────
// 2. GET ALL SCHEMES
// ─────────────────────────────────────────────
export const getAllSchemes = async (shopId, filters = {}) => {
  const {
    page = 1, limit = 20, sort = '-createdAt',
    status, schemeType, isActive, isFeatured,
    startDate, endDate,
  } = filters;

  const query = { shopId, deletedAt: null };

  if (status)     query.status                  = status;
  if (schemeType) query.schemeType               = schemeType;
  if (isActive !== undefined)   query['validity.isActive']     = isActive === 'true';
  if (isFeatured !== undefined) query['marketing.isFeatured']  = isFeatured === 'true';

  if (startDate || endDate) {
    query['validity.startDate'] = {};
    if (startDate) query['validity.startDate'].$gte = new Date(startDate);
    if (endDate)   query['validity.startDate'].$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [schemes, total] = await Promise.all([
    Scheme.find(query)
      .sort(sort).skip(skip).limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName')
      .lean(),
    Scheme.countDocuments(query),
  ]);

  return {
    schemes,
    page:  parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  };
};

// ─────────────────────────────────────────────
// 3. GET SCHEME BY ID
// ─────────────────────────────────────────────
export const getSchemeById = async (shopId, schemeId) => {
  const scheme = await Scheme.findOne({ _id: schemeId, shopId, deletedAt: null })
    .populate('createdBy', 'firstName lastName email')
    .populate('approvedBy', 'firstName lastName')
    .lean();

  if (!scheme) throw new NotFoundError('Scheme not found');

  // Include enrollment stats
  const [totalEnrollments, activeEnrollments, completedEnrollments] = await Promise.all([
    SchemeEnrollment.countDocuments({ schemeId, deletedAt: null }),
    SchemeEnrollment.countDocuments({ schemeId, status: 'active', deletedAt: null }),
    SchemeEnrollment.countDocuments({ schemeId, status: 'matured', deletedAt: null }),
  ]);

  return { ...scheme, enrollmentStats: { totalEnrollments, activeEnrollments, completedEnrollments } };
};

// ─────────────────────────────────────────────
// 4. UPDATE SCHEME
// ─────────────────────────────────────────────
export const updateScheme = async (shopId, schemeId, data, userId) => {
  const scheme = await findScheme(shopId, schemeId);

  if (!['draft', 'paused'].includes(scheme.status)) {
    // Check if has enrollments
    const enrollmentCount = await SchemeEnrollment.countDocuments({
      schemeId, status: 'active', deletedAt: null,
    });
    if (enrollmentCount > 0) {
      throw new BadRequestError('Cannot edit active scheme with enrollments');
    }
  }

  if (data.schemeCode) delete data.schemeCode;
  if (data.organizationId) delete data.organizationId;

  // Cannot reduce installment amount if enrollments exist
  if (data.installments?.installmentAmount) {
    const count = await SchemeEnrollment.countDocuments({ schemeId, deletedAt: null });
    if (count > 0 && data.installments.installmentAmount < scheme.installments.installmentAmount) {
      throw new BadRequestError('Cannot reduce installment amount when enrollments exist');
    }
  }

  Object.assign(scheme, data);
  scheme.updatedBy = userId;
  await scheme.save();

  await eventLogger.logActivity({
    userId,
    organizationId: scheme.organizationId,
    shopId,
    action:      'update',
    module:      'scheme',
    description: `Updated scheme: ${scheme.schemeName}`,
    level:       'info',
    status:      'success',
    metadata:    { schemeId: scheme._id },
  });

  return scheme;
};

// ─────────────────────────────────────────────
// 5. DELETE SCHEME (archive / soft delete)
// ─────────────────────────────────────────────
export const deleteScheme = async (shopId, schemeId, userId) => {
  const scheme = await findScheme(shopId, schemeId);

  const activeEnrollments = await SchemeEnrollment.countDocuments({
    schemeId, status: 'active', deletedAt: null,
  });

  if (activeEnrollments > 0) {
    throw new BadRequestError('Cannot delete scheme with active enrollments');
  }

  await scheme.archive();

  await eventLogger.logActivity({
    userId,
    organizationId: scheme.organizationId,
    shopId,
    action:      'delete',
    module:      'scheme',
    description: `Archived scheme: ${scheme.schemeName}`,
    level:       'warn',
    status:      'success',
    metadata:    { schemeId: scheme._id },
  });

  return scheme;
};

// ─────────────────────────────────────────────
// 6. STATUS MANAGEMENT
// ─────────────────────────────────────────────
export const updateSchemeStatus = async (shopId, schemeId, status, userId) => {
  const scheme = await findScheme(shopId, schemeId);
  scheme.status = status;
  if (status === 'active') scheme.validity.isActive = true;
  if (status === 'paused' || status === 'archived') scheme.validity.isActive = false;
  scheme.updatedBy = userId;
  await scheme.save();
  return scheme;
};

export const activateScheme = async (shopId, schemeId, userId) => {
  const scheme = await findScheme(shopId, schemeId);

  if (scheme.approvalStatus !== 'approved') {
    throw new BadRequestError('Scheme must be approved before activation');
  }

  await scheme.activate();
  scheme.updatedBy = userId;
  await scheme.save();

  return scheme;
};

export const pauseScheme = async (shopId, schemeId, reason, userId) => {
  const scheme = await findScheme(shopId, schemeId);
  await scheme.pause();
  if (reason) scheme.internalNotes = reason;
  scheme.updatedBy = userId;
  await scheme.save();
  return scheme;
};

export const archiveScheme = async (shopId, schemeId, userId) => {
  return deleteScheme(shopId, schemeId, userId);
};

// ─────────────────────────────────────────────
// 7. APPROVAL
// ─────────────────────────────────────────────
export const approveScheme = async (shopId, schemeId, userId, notes) => {
  const scheme = await findScheme(shopId, schemeId);

  if (scheme.approvalStatus === 'approved') {
    throw new BadRequestError('Scheme is already approved');
  }

  await scheme.approve(userId);
  if (notes) scheme.notes = notes;
  await scheme.save();

  await eventLogger.logActivity({
    userId,
    organizationId: scheme.organizationId,
    shopId,
    action:      'approve',
    module:      'scheme',
    description: `Approved scheme: ${scheme.schemeName}`,
    level:       'info',
    status:      'success',
  });

  return scheme;
};

export const rejectScheme = async (shopId, schemeId, userId, reason) => {
  const scheme = await findScheme(shopId, schemeId);
  await scheme.reject(userId, reason);

  await eventLogger.logActivity({
    userId,
    organizationId: scheme.organizationId,
    shopId,
    action:      'reject',
    module:      'scheme',
    description: `Rejected scheme: ${scheme.schemeName}`,
    level:       'warn',
    status:      'success',
    metadata:    { reason },
  });

  return scheme;
};

// ─────────────────────────────────────────────
// 8. ENROLL CUSTOMER
// ─────────────────────────────────────────────
export const enrollCustomer = async (shopId, organizationId, schemeId, data, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const scheme = await findScheme(shopId, schemeId);

    if (!scheme.isEnrollmentOpen) {
      throw new BadRequestError('Enrollment is not open for this scheme');
    }

    // Enrollment limit check
    if (
      scheme.limits.maxEnrollments &&
      scheme.limits.currentEnrollments >= scheme.limits.maxEnrollments
    ) {
      throw new BadRequestError('Maximum enrollment limit reached for this scheme');
    }

    // Customer max enrollments check
    const customerEnrollments = await SchemeEnrollment.countDocuments({
      schemeId,
      customerId: data.customerId,
      status:     { $in: ['active', 'matured'] },
      deletedAt:  null,
    });

    if (customerEnrollments >= scheme.limits.maxEnrollmentsPerCustomer) {
      throw new BadRequestError(
        `Customer already has ${customerEnrollments} enrollment(s) in this scheme`
      );
    }

    const customer = await Customer.findById(data.customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    // KYC check
    if (scheme.eligibility.requiresKYC && !data.kyc) {
      throw new ValidationError('KYC documents are required for this scheme');
    }

    // Metal rate at enrollment
    const currentRate = await MetalRate.getCurrentRate(shopId);
    const metalRateAtEnrollment = currentRate
      ? {
          gold24K: currentRate.gold?.gold24K?.sellingRate || 0,
          gold22K: currentRate.gold?.gold22K?.sellingRate || 0,
          silver:  currentRate.silver?.pure?.sellingRate  || 0,
          rateDate: new Date(),
        }
      : { gold24K: 0, gold22K: 0, silver: 0, rateDate: new Date() };

    const installmentAmount  = data.installmentAmount || scheme.installments.installmentAmount;
    const totalInstallments  = scheme.installments.totalInstallments;
    const frequency          = scheme.installments.frequency;
    const startDate          = data.startDate ? new Date(data.startDate) : new Date();

    // Expected end date
    let expectedEndDate = new Date(startDate);
    if (frequency === 'monthly') {
      expectedEndDate.setMonth(expectedEndDate.getMonth() + totalInstallments);
    } else if (frequency === 'weekly') {
      expectedEndDate.setDate(expectedEndDate.getDate() + totalInstallments * 7);
    }

    const enrollmentNumber = await SchemeEnrollment.generateEnrollmentNumber(
      shopId, scheme.schemeCode
    );

    const [enrollment] = await SchemeEnrollment.create(
      [
        {
          organizationId,
          shopId,
          enrollmentNumber,
          schemeId,
          customerId:  data.customerId,
          customerDetails: {
            customerName: customer.fullName,
            customerCode: customer.customerCode,
            phone:        customer.phone,
            email:        customer.email,
          },
          installmentAmount,
          totalInstallments,
          frequency,
          startDate,
          nextDueDate: startDate,
          expectedEndDate,
          maturityDate: expectedEndDate,
          status:      'active',
          metalRateAtEnrollment,
          kyc: data.kyc
            ? { isVerified: false, documents: data.kyc.documents || [] }
            : { isVerified: !scheme.eligibility.requiresKYC },
          enrolledBy: userId,
          createdBy:  userId,
          notes:      data.notes || '',
        },
      ],
      { session }
    );

    // Generate schedule
    enrollment.generateSchedule();
    await enrollment.save({ session });

    // Increment enrollment count on scheme
    await scheme.incrementEnrollment();

    // Record initial payment if provided
    if (data.initialPayment) {
      const paymentNumber = await Payment.generatePaymentNumber(shopId, 'PAY');
      const [payment] = await Payment.create(
        [
          {
            organizationId,
            shopId,
            paymentNumber,
            paymentDate:     new Date(),
            paymentType:     'scheme_payment',
            transactionType: 'receipt',
            amount:          data.initialPayment.amount,
            paymentMode:     data.initialPayment.paymentMode || 'cash',
            party: {
              partyType: 'customer',
              partyId:   customer._id,
              partyModel:'Customer',
              partyName: customer.fullName,
            },
            reference: {
              referenceType:   'scheme_enrollment',
              referenceId:     enrollment._id,
              referenceModel:  'SchemeEnrollment',
              referenceNumber: enrollmentNumber,
            },
            processedBy: userId,
            createdBy:   userId,
            status:      'completed',
          },
        ],
        { session }
      );

      // Mark first installment as paid
      const firstInstallment = enrollment.schedule[0];
      if (firstInstallment) {
        firstInstallment.status     = 'paid';
        firstInstallment.paidDate   = new Date();
        firstInstallment.paidAmount = data.initialPayment.amount;
        firstInstallment.paymentId  = payment._id;
        enrollment.paidInstallments   = 1;
        enrollment.totalPaidAmount    = data.initialPayment.amount;
        enrollment.nextDueDate        = enrollment.schedule[1]?.dueDate || null;
        await enrollment.save({ session });
      }
    }

    await session.commitTransaction();

    // Emit event
    eventBus.emit('SCHEME_ENROLLMENT_CREATED', {
      enrollment,
      customer,
      scheme,
      organizationId,
      shopId,
      userId,
    });

    await eventLogger.logActivity({
      userId,
      organizationId,
      shopId,
      action:      'enroll',
      module:      'scheme',
      description: `Customer ${customer.fullName} enrolled in ${scheme.schemeName}`,
      level:       'info',
      status:      'success',
      metadata:    { enrollmentId: enrollment._id, enrollmentNumber, schemeId },
    });

    return enrollment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// 9. GET SCHEME ENROLLMENTS
// ─────────────────────────────────────────────
export const getSchemeEnrollments = async (shopId, schemeId, filters = {}) => {
  const { page = 1, limit = 20, status } = filters;

  const query = { shopId, schemeId, deletedAt: null };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [enrollments, total] = await Promise.all([
    SchemeEnrollment.find(query)
      .sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('customerId', 'firstName lastName phone customerCode')
      .lean(),
    SchemeEnrollment.countDocuments(query),
  ]);

  return { enrollments, page: parseInt(page), limit: parseInt(limit), total };
};

// ─────────────────────────────────────────────
// 10. GET SINGLE ENROLLMENT
// ─────────────────────────────────────────────
export const getEnrollmentById = async (shopId, enrollmentId) => {
  const enrollment = await SchemeEnrollment.findOne({
    _id: enrollmentId, shopId, deletedAt: null,
  })
    .populate('schemeId', 'schemeName schemeCode installments bonus maturity')
    .populate('customerId', 'firstName lastName phone email customerCode')
    .populate('enrolledBy', 'firstName lastName')
    .lean();

  if (!enrollment) throw new NotFoundError('Enrollment not found');
  return enrollment;
};

// ─────────────────────────────────────────────
// 11. UPDATE ENROLLMENT
// ─────────────────────────────────────────────
export const updateEnrollment = async (shopId, enrollmentId, data, userId) => {
  const enrollment = await findEnrollment(shopId, enrollmentId);

  if (enrollment.status === 'cancelled') {
    throw new BadRequestError('Cannot update cancelled enrollment');
  }

  // Protect immutable fields
  delete data.enrollmentNumber;
  delete data.schemeId;
  delete data.customerId;
  delete data.organizationId;

  Object.assign(enrollment, data);
  enrollment.updatedBy = userId;
  await enrollment.save();

  return enrollment;
};

// ─────────────────────────────────────────────
// 12. CANCEL ENROLLMENT
// ─────────────────────────────────────────────
export const cancelEnrollment = async (shopId, enrollmentId, data, userId) => {
  const enrollment = await findEnrollment(shopId, enrollmentId);

  if (enrollment.status === 'cancelled') {
    throw new BadRequestError('Enrollment is already cancelled');
  }

  enrollment.status    = 'cancelled';
  enrollment.cancellation = {
    isCancelled:        true,
    cancelledAt:        new Date(),
    cancelledBy:        userId,
    cancellationReason: data.reason || '',
    refundAmount:       data.refundAmount || 0,
    refundStatus:       data.refundAmount > 0 ? 'pending' : 'not_applicable',
  };
  enrollment.updatedBy = userId;
  await enrollment.save();

  // Decrement scheme enrollment count
  const scheme = await Scheme.findById(enrollment.schemeId);
  if (scheme) await scheme.decrementEnrollment();

  eventBus.emit('SCHEME_ENROLLMENT_CANCELLED', { enrollment, userId });

  return enrollment;
};

// ─────────────────────────────────────────────
// 13. RECORD INSTALLMENT PAYMENT
// ─────────────────────────────────────────────
export const recordInstallmentPayment = async (shopId, organizationId, enrollmentId, data, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const enrollment = await SchemeEnrollment.findOne({
      _id: enrollmentId, shopId, deletedAt: null,
    }).session(session);

    if (!enrollment) throw new NotFoundError('Enrollment not found');

    if (enrollment.status !== 'active') {
      throw new BadRequestError('Can only record payment for active enrollments');
    }

    if (enrollment.paidInstallments >= enrollment.totalInstallments) {
      throw new BadRequestError('All installments are already paid');
    }

    // Create payment
    const paymentNumber = await Payment.generatePaymentNumber(shopId, 'PAY');

    const [payment] = await Payment.create(
      [
        {
          organizationId,
          shopId,
          paymentNumber,
          paymentDate:     data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentType:     'scheme_payment',
          transactionType: 'receipt',
          amount:          data.amount,
          paymentMode:     data.paymentMode,
          transactionId:   data.transactionId || null,
          party: {
            partyType: 'customer',
            partyId:   enrollment.customerId,
            partyModel:'Customer',
            partyName: enrollment.customerDetails.customerName,
          },
          reference: {
            referenceType:   'scheme_enrollment',
            referenceId:     enrollment._id,
            referenceModel:  'SchemeEnrollment',
            referenceNumber: enrollment.enrollmentNumber,
          },
          processedBy: userId,
          createdBy:   userId,
          status:      'completed',
          notes:       data.notes || '',
        },
      ],
      { session }
    );

    // Record payment in enrollment
    await enrollment.recordPayment({
      amount:    data.amount,
      paymentId: payment._id,
      paidDate:  payment.paymentDate,
    });

    await session.commitTransaction();

    eventBus.emit('SCHEME_PAYMENT_RECORDED', {
      enrollment,
      payment,
      organizationId,
      shopId,
      userId,
    });

    await eventLogger.logActivity({
      userId,
      organizationId,
      shopId,
      action:      'payment',
      module:      'scheme',
      description: `Installment ${enrollment.paidInstallments}/${enrollment.totalInstallments} paid for ${enrollment.enrollmentNumber}`,
      level:       'info',
      status:      'success',
      metadata:    { enrollmentId: enrollment._id, amount: data.amount, paymentId: payment._id },
    });

    return { enrollment, payment };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// 14. GET ENROLLMENT PAYMENTS
// ─────────────────────────────────────────────
export const getEnrollmentPayments = async (shopId, enrollmentId) => {
  await findEnrollment(shopId, enrollmentId);

  return Payment.find({
    'reference.referenceId':   enrollmentId,
    'reference.referenceType': 'scheme_enrollment',
    shopId,
    deletedAt: null,
  }).sort('-paymentDate').lean();
};

// ─────────────────────────────────────────────
// 15. GET INSTALLMENT SCHEDULE
// ─────────────────────────────────────────────
export const getInstallmentSchedule = async (shopId, enrollmentId) => {
  const enrollment = await SchemeEnrollment.findOne({
    _id: enrollmentId, shopId, deletedAt: null,
  })
    .select('schedule enrollmentNumber totalInstallments paidInstallments nextDueDate status')
    .lean();

  if (!enrollment) throw new NotFoundError('Enrollment not found');
  return enrollment;
};

// ─────────────────────────────────────────────
// 16. CALCULATE MATURITY VALUE
// ─────────────────────────────────────────────
export const calculateMaturityValue = async (shopId, enrollmentId) => {
  const enrollment = await SchemeEnrollment.findOne({
    _id: enrollmentId, shopId, deletedAt: null,
  }).populate('schemeId');

  if (!enrollment) throw new NotFoundError('Enrollment not found');

  const scheme = enrollment.schemeId;
  const maturityData = enrollment.calculateCurrentMaturity(scheme.bonus);

  // Gold equivalent (based on 22K rate at enrollment)
  const goldRate = enrollment.metalRateAtEnrollment?.gold22K || 0;
  const goldEquivalentGrams = goldRate > 0 ? maturityData.totalMaturityValue / goldRate : 0;

  return {
    enrollmentNumber:   enrollment.enrollmentNumber,
    paidInstallments:   enrollment.paidInstallments,
    totalInstallments:  enrollment.totalInstallments,
    totalPaidAmount:    maturityData.paidAmount,
    bonusAmount:        maturityData.bonusAmount,
    totalMaturityValue: maturityData.totalMaturityValue,
    goldEquivalentGrams: parseFloat(goldEquivalentGrams.toFixed(3)),
    maturityDate:       enrollment.maturityDate,
    status:             enrollment.status,
  };
};

// ─────────────────────────────────────────────
// 17. MARK AS MATURED
// ─────────────────────────────────────────────
export const matureEnrollment = async (shopId, enrollmentId, userId) => {
  const enrollment = await findEnrollment(shopId, enrollmentId);

  if (enrollment.paidInstallments < enrollment.totalInstallments) {
    throw new BadRequestError(
      `Cannot mature: ${enrollment.totalInstallments - enrollment.paidInstallments} installment(s) remaining`
    );
  }

  const scheme = await Scheme.findById(enrollment.schemeId);
  const maturityData = enrollment.calculateCurrentMaturity(scheme?.bonus);
  const goldRate = enrollment.metalRateAtEnrollment?.gold22K || 0;

  enrollment.status           = 'matured';
  enrollment.actualEndDate    = new Date();
  enrollment.maturityDate     = new Date();
  enrollment.maturity = {
    totalSchemeAmount:   maturityData.paidAmount,
    bonusAmount:         maturityData.bonusAmount,
    totalMaturityValue:  maturityData.totalMaturityValue,
    goldEquivalentGrams: goldRate > 0 ? maturityData.totalMaturityValue / goldRate : 0,
    isCalculated:        true,
    calculatedAt:        new Date(),
  };
  enrollment.updatedBy = userId;
  await enrollment.save();

  // Update scheme stats
  if (scheme) {
    scheme.statistics.completedEnrollments += 1;
    scheme.statistics.activeEnrollments    = Math.max(0, scheme.statistics.activeEnrollments - 1);
    await scheme.save();
  }

  eventBus.emit('SCHEME_ENROLLMENT_MATURED', { enrollment, userId });

  return enrollment;
};

// ─────────────────────────────────────────────
// 18. REDEEM ENROLLMENT
// ─────────────────────────────────────────────
export const redeemEnrollment = async (shopId, enrollmentId, data, userId) => {
  const enrollment = await findEnrollment(shopId, enrollmentId);

  if (!['matured', 'active'].includes(enrollment.status)) {
    throw new BadRequestError('Enrollment cannot be redeemed in current status');
  }

  const scheme = await Scheme.findById(enrollment.schemeId);

  // Early redemption
  const isEarly = enrollment.status === 'active';

  if (isEarly && !scheme.redemption.canRedeemEarly) {
    throw new BadRequestError('Early redemption is not allowed for this scheme');
  }

  const maturityData  = enrollment.calculateCurrentMaturity(scheme?.bonus);
  let   penaltyApplied = 0;

  if (isEarly && scheme.redemption.earlyRedemptionPenalty.type !== 'none') {
    if (scheme.redemption.earlyRedemptionPenalty.type === 'percentage') {
      penaltyApplied =
        (maturityData.paidAmount * scheme.redemption.earlyRedemptionPenalty.value) / 100;
    } else if (scheme.redemption.earlyRedemptionPenalty.type === 'flat') {
      penaltyApplied = scheme.redemption.earlyRedemptionPenalty.value;
    }
  }

  const netValue = maturityData.totalMaturityValue - penaltyApplied;

  enrollment.status            = 'redeemed';
  enrollment.redemption = {
    isRedeemed:         true,
    redemptionDate:     new Date(),
    redemptionType:     isEarly ? 'early' : 'normal',
    redemptionMode:     data.redemptionMode,
    redemptionValue:    maturityData.totalMaturityValue,
    penaltyApplied,
    netRedemptionValue: netValue,
    linkedSaleId:       data.linkedSaleId || null,
    notes:              data.notes || '',
  };
  enrollment.updatedBy = userId;
  await enrollment.save();

  eventBus.emit('SCHEME_ENROLLMENT_REDEEMED', {
    enrollment, scheme, userId, isEarly, netValue,
  });

  await eventLogger.logActivity({
    userId,
    organizationId: enrollment.organizationId,
    shopId,
    action:      'redeem',
    module:      'scheme',
    description: `Enrollment ${enrollment.enrollmentNumber} redeemed — ₹${netValue}`,
    level:       'info',
    status:      'success',
    metadata:    { enrollmentId: enrollment._id, netValue, isEarly, penaltyApplied },
  });

  return enrollment;
};

// ─────────────────────────────────────────────
// 19. CUSTOMER ENROLLMENTS
// ─────────────────────────────────────────────
export const getCustomerEnrollments = async (shopId, customerId, filters = {}) => {
  const { page = 1, limit = 20, status } = filters;
  const query = { shopId, customerId, deletedAt: null };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [enrollments, total] = await Promise.all([
    SchemeEnrollment.find(query)
      .sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('schemeId', 'schemeName schemeCode schemeType')
      .lean(),
    SchemeEnrollment.countDocuments(query),
  ]);

  return { enrollments, page: parseInt(page), limit: parseInt(limit), total };
};

export const getCustomerSchemeSummary = async (shopId, customerId) => {
  const enrollments = await SchemeEnrollment.find({
    shopId, customerId, deletedAt: null,
  }).lean();

  const summary = {
    totalEnrollments:     enrollments.length,
    activeEnrollments:    enrollments.filter(e => e.status === 'active').length,
    completedEnrollments: enrollments.filter(e => e.status === 'matured').length,
    cancelledEnrollments: enrollments.filter(e => e.status === 'cancelled').length,
    redeemedEnrollments:  enrollments.filter(e => e.status === 'redeemed').length,
    totalAmountPaid:      enrollments.reduce((sum, e) => sum + (e.totalPaidAmount || 0), 0),
    totalMaturityValue:   enrollments.reduce((sum, e) => sum + (e.maturity?.totalMaturityValue || 0), 0),
    nextDueInstallments:  enrollments
      .filter(e => e.status === 'active' && e.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
      .slice(0, 5)
      .map(e => ({
        enrollmentNumber: e.enrollmentNumber,
        nextDueDate:      e.nextDueDate,
        amount:           e.installmentAmount,
        schemeId:         e.schemeId,
      })),
  };

  return summary;
};

// ─────────────────────────────────────────────
// 20. ANALYTICS
// ─────────────────────────────────────────────
export const getSchemeAnalytics = async (shopId, organizationId, filters = {}) => {
  const { startDate, endDate } = filters;

  const matchBase = {
    shopId:         new mongoose.Types.ObjectId(shopId),
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt:      null,
  };

  if (startDate || endDate) {
    matchBase.createdAt = {};
    if (startDate) matchBase.createdAt.$gte = new Date(startDate);
    if (endDate)   matchBase.createdAt.$lte = new Date(endDate);
  }

  const [
    schemeStats,
    enrollmentStats,
    revenueData,
    topSchemes,
    monthlyTrend,
  ] = await Promise.all([
    Scheme.aggregate([
      { $match: { ...matchBase } },
      {
        $group: {
          _id:            null,
          totalSchemes:   { $sum: 1 },
          activeSchemes:  { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          pausedSchemes:  { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
          draftSchemes:   { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
        },
      },
    ]),
    SchemeEnrollment.aggregate([
      { $match: { ...matchBase } },
      {
        $group: {
          _id:                  null,
          totalEnrollments:     { $sum: 1 },
          activeEnrollments:    { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'matured'] }, 1, 0] } },
          cancelledEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalRevenue:         { $sum: '$totalPaidAmount' },
        },
      },
    ]),
    Payment.aggregate([
      {
        $match: {
          shopId:         new mongoose.Types.ObjectId(shopId),
          paymentType:    'scheme_payment',
          status:         'completed',
          deletedAt:      null,
          ...(startDate || endDate
            ? { paymentDate: { ...(startDate ? { $gte: new Date(startDate) } : {}), ...(endDate ? { $lte: new Date(endDate) } : {}) } }
            : {}),
        },
      },
      { $group: { _id: null, totalCollected: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    SchemeEnrollment.aggregate([
      { $match: { ...matchBase } },
      {
        $group: {
          _id:          '$schemeId',
          enrollments:  { $sum: 1 },
          totalRevenue: { $sum: '$totalPaidAmount' },
        },
      },
      { $sort: { enrollments: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'schemes',
          localField:   '_id',
          foreignField: '_id',
          as:           'scheme',
        },
      },
      { $unwind: '$scheme' },
      {
        $project: {
          _id:         0,
          schemeId:    '$_id',
          schemeName:  '$scheme.schemeName',
          schemeCode:  '$scheme.schemeCode',
          enrollments: 1,
          totalRevenue:1,
        },
      },
    ]),
    SchemeEnrollment.aggregate([
      { $match: { ...matchBase } },
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newEnrollments: { $sum: 1 },
          revenue:        { $sum: '$totalPaidAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  return {
    schemeStats:      schemeStats[0]     || { totalSchemes: 0, activeSchemes: 0 },
    enrollmentStats:  enrollmentStats[0] || { totalEnrollments: 0, totalRevenue: 0 },
    totalCollected:   revenueData[0]?.totalCollected || 0,
    topSchemes,
    monthlyTrend,
  };
};

export const getSchemeDashboard = async (shopId) => {
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd  = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(today);
  monthEnd.setDate(monthEnd.getDate() + 30);

  const [
    activeSchemes,
    totalEnrollments,
    dueToday,
    dueThisWeek,
    maturingThisMonth,
    recentEnrollments,
  ] = await Promise.all([
    Scheme.countDocuments({ shopId, status: 'active', deletedAt: null }),
    SchemeEnrollment.countDocuments({ shopId, status: 'active', deletedAt: null }),
    SchemeEnrollment.findDueToday(shopId),
    SchemeEnrollment.findUpcoming(shopId, 7),
    SchemeEnrollment.findMaturingSoon(shopId, 30),
    SchemeEnrollment.find({ shopId, deletedAt: null })
      .sort('-createdAt').limit(5)
      .populate('customerId', 'firstName lastName phone')
      .populate('schemeId', 'schemeName')
      .lean(),
  ]);

  return {
    activeSchemes,
    totalEnrollments,
    dueCollectionsToday:    { count: dueToday.length,          amount: dueToday.reduce((s, e) => s + e.installmentAmount, 0) },
    dueCollectionsThisWeek: { count: dueThisWeek.length,       amount: dueThisWeek.reduce((s, e) => s + e.installmentAmount, 0) },
    maturingThisMonth:      { count: maturingThisMonth.length },
    recentEnrollments,
  };
};

export const getSchemeSpecificAnalytics = async (shopId, schemeId) => {
  const scheme = await findScheme(shopId, schemeId);

  const [total, active, completed, cancelled, revenueData] = await Promise.all([
    SchemeEnrollment.countDocuments({ schemeId, deletedAt: null }),
    SchemeEnrollment.countDocuments({ schemeId, status: 'active',    deletedAt: null }),
    SchemeEnrollment.countDocuments({ schemeId, status: 'matured',   deletedAt: null }),
    SchemeEnrollment.countDocuments({ schemeId, status: 'cancelled', deletedAt: null }),
    SchemeEnrollment.aggregate([
      { $match: { schemeId: new mongoose.Types.ObjectId(schemeId), deletedAt: null } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPaidAmount' }, avgCollection: { $avg: '$totalPaidAmount' } } },
    ]),
  ]);

  const completionRate  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const earlyRedemption = await SchemeEnrollment.countDocuments({
    schemeId, 'redemption.redemptionType': 'early', deletedAt: null,
  });
  const earlyRedemptionRate = total > 0 ? Math.round((earlyRedemption / total) * 100) : 0;

  return {
    scheme: { _id: scheme._id, schemeName: scheme.schemeName, schemeCode: scheme.schemeCode },
    totalEnrollments:     total,
    activeEnrollments:    active,
    completedEnrollments: completed,
    cancelledEnrollments: cancelled,
    totalRevenue:         revenueData[0]?.totalRevenue   || 0,
    avgCollectionPerMonth:revenueData[0]?.avgCollection  || 0,
    completionRate,
    earlyRedemptionRate,
  };
};

// ─────────────────────────────────────────────
// 21. DUE COLLECTIONS
// ─────────────────────────────────────────────
export const getDuesToday = async (shopId) => {
  const dues = await SchemeEnrollment.findDueToday(shopId)
    .populate('customerId', 'firstName lastName phone')
    .populate('schemeId', 'schemeName schemeCode')
    .lean();
  return dues;
};

export const getOverdueDues = async (shopId) => {
  const dues = await SchemeEnrollment.findOverdue(shopId)
    .populate('customerId', 'firstName lastName phone')
    .populate('schemeId', 'schemeName schemeCode')
    .lean();

  return dues.map(e => ({
    ...e,
    daysOverdue:   Math.floor((new Date() - new Date(e.nextDueDate)) / (1000 * 60 * 60 * 24)),
    penaltyAmount: 0, // Calculate based on scheme rules if needed
  }));
};

export const getUpcomingDues = async (shopId, days = 7) => {
  return SchemeEnrollment.findUpcoming(shopId, days)
    .populate('customerId', 'firstName lastName phone')
    .populate('schemeId', 'schemeName schemeCode')
    .lean();
};

export const sendPaymentReminders = async (shopId, organizationId, data, userId) => {
  const { enrollmentIds, method } = data;

  const enrollments = await SchemeEnrollment.find({
    _id:      { $in: enrollmentIds },
    shopId,
    status:   'active',
    deletedAt: null,
  }).populate('customerId', 'firstName lastName phone email').lean();

  let sentCount = 0;

  for (const enrollment of enrollments) {
    eventBus.emit('SCHEME_PAYMENT_REMINDER', {
      enrollment,
      customer: enrollment.customerId,
      method,
      organizationId,
      shopId,
    });
    sentCount++;
  }

  await eventLogger.logActivity({
    userId,
    organizationId,
    shopId,
    action:      'send_reminders',
    module:      'scheme',
    description: `Sent ${sentCount} payment reminders via ${method}`,
    level:       'info',
    status:      'success',
    metadata:    { sentCount, method },
  });

  return { sentCount, totalRequested: enrollmentIds.length, method };
};

// ─────────────────────────────────────────────
// 22. FILTERS & SEARCH
// ─────────────────────────────────────────────
export const getActiveSchemes = async (shopId) => {
  return Scheme.findActive(shopId).lean();
};

export const getFeaturedSchemes = async (shopId) => {
  return Scheme.findFeatured(shopId).lean();
};

export const getExpiringSoonSchemes = async (shopId, days = 30) => {
  return Scheme.findExpiringSoon(shopId, days).lean();
};

export const getSchemesByType = async (shopId, schemeType) => {
  return Scheme.findByType(shopId, schemeType).lean();
};

export const searchSchemes = async (shopId, q, limit = 20) => {
  const regex = new RegExp(q, 'i');
  return Scheme.find({
    shopId,
    deletedAt: null,
    $or: [
      { schemeName: regex },
      { schemeCode: regex },
      { description: regex },
    ],
  }).limit(parseInt(limit)).lean();
};

// ─────────────────────────────────────────────
// 23. BULK OPERATIONS
// ─────────────────────────────────────────────
export const bulkSendReminders = async (shopId, organizationId, data, userId) => {
  return sendPaymentReminders(shopId, organizationId, data, userId);
};

export const bulkExportSchemes = async (shopId, data) => {
  const { schemeIds, format } = data;

  let query = { shopId, deletedAt: null };
  if (schemeIds && schemeIds.length > 0) query._id = { $in: schemeIds };

  const schemes = await Scheme.find(query)
    .populate('createdBy', 'firstName lastName')
    .lean();

  return { schemes, count: schemes.length, format };
};

// ─────────────────────────────────────────────
// 24. MATURITY TRACKING
// ─────────────────────────────────────────────
export const getMaturingSoon = async (shopId, days = 30, filters = {}) => {
  const { page = 1, limit = 20 } = filters;

  return SchemeEnrollment.findMaturingSoon(shopId, days)
    .populate('customerId', 'firstName lastName phone')
    .populate('schemeId', 'schemeName schemeCode')
    .lean();
};

export const getMaturedEnrollments = async (shopId, filters = {}) => {
  const { page = 1, limit = 20, startDate, endDate } = filters;

  const query = { shopId, status: { $in: ['matured', 'redeemed'] }, deletedAt: null };

  if (startDate || endDate) {
    query.actualEndDate = {};
    if (startDate) query.actualEndDate.$gte = new Date(startDate);
    if (endDate)   query.actualEndDate.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [enrollments, total] = await Promise.all([
    SchemeEnrollment.find(query)
      .sort('-actualEndDate').skip(skip).limit(parseInt(limit))
      .populate('customerId', 'firstName lastName phone')
      .populate('schemeId', 'schemeName schemeCode')
      .lean(),
    SchemeEnrollment.countDocuments(query),
  ]);

  return { enrollments, page: parseInt(page), limit: parseInt(limit), total };
};