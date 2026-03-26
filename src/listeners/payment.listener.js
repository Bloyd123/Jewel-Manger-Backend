import eventBus from '../eventBus.js';
import Payment from '../models/Payment.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// PAYMENT_COMPLETED — payment status completed karo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_COMPLETED', async (data) => {
  try {
    const { payment } = data;

    await Payment.findByIdAndUpdate(payment._id, {
      $set: { status: 'completed' },
    });
  } catch (error) {
    logger.error('payment.listener PAYMENT_COMPLETED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PAYMENT_CANCELLED — poora cancel flow
// Step 1 — Payment status cancelled karo
// Step 2 — Agar cheque tha toh cheque status bhi cancelled karo
// Step 3 — Notes mein cancellation reason add karo
// (ledger reverse aur reference reverse
//  ledger.listener aur reference.listener handle karenge)
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_CANCELLED', async (data) => {
  try {
    const { payment, reason, userId } = data;

    // Step 1 — notes prepare karo
    const existingNotes = payment.notes || '';
    const updatedNotes  = reason
      ? `${existingNotes ? existingNotes + '\n' : ''}Cancellation reason: ${reason}`
      : existingNotes;

    // Step 2 — payment status update karo
    const updateFields = {
      status:    'cancelled',
      updatedBy: userId,
      notes:     updatedNotes,
    };

    // Step 3 — agar cheque tha toh cheque status bhi cancelled karo
    if (payment.paymentMode === 'cheque') {
      updateFields['paymentDetails.chequeDetails.chequeStatus'] = 'cancelled';
    }

    await Payment.findByIdAndUpdate(payment._id, {
      $set: updateFields,
    });

  } catch (error) {
    logger.error('payment.listener PAYMENT_CANCELLED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// CHEQUE_CLEARED — cheque status cleared karo
// aur payment completed karo
// ─────────────────────────────────────────────
eventBus.on('CHEQUE_CLEARED', async (data) => {
  try {
    const { payment, clearanceDate, notes, userId } = data;

    const updateFields = {
      status:    'completed',
      updatedBy: userId,
      'paymentDetails.chequeDetails.chequeStatus':  'cleared',
      'paymentDetails.chequeDetails.clearanceDate': clearanceDate || new Date(),
    };

    // notes agar hai toh add karo
    if (notes) {
      updateFields.notes = payment.notes
        ? `${payment.notes}\n${notes}`
        : notes;
    }

    await Payment.findByIdAndUpdate(payment._id, {
      $set: updateFields,
    });
  } catch (error) {
    logger.error('payment.listener CHEQUE_CLEARED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// CHEQUE_BOUNCED — cheque status bounced karo
// aur payment failed karo
// ─────────────────────────────────────────────
eventBus.on('CHEQUE_BOUNCED', async (data) => {
  try {
    const { payment, bounceReason, notes, userId } = data;

    const updateFields = {
      status:    'failed',
      updatedBy: userId,
      'paymentDetails.chequeDetails.chequeStatus': 'bounced',
      'paymentDetails.chequeDetails.bounceReason': bounceReason,
    };

    // notes agar hai toh add karo
    if (notes) {
      updateFields.notes = payment.notes
        ? `${payment.notes}\n${notes}`
        : notes;
    }

    await Payment.findByIdAndUpdate(payment._id, {
      $set: updateFields,
    });
  } catch (error) {
    logger.error('payment.listener CHEQUE_BOUNCED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PAYMENT_REFUNDED — original payment ka
// status refunded karo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_REFUNDED', async (data) => {
  try {
    const { originalPaymentId } = data;

    await Payment.findByIdAndUpdate(originalPaymentId, {
      $set: { status: 'refunded' },
    });
  } catch (error) {
    logger.error('payment.listener PAYMENT_REFUNDED failed:', error.message);
  }
});