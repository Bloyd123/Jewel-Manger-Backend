// FILE: src/api/scheme/scheme.controller.js
import { validationResult } from 'express-validator';
import * as schemeService from './scheme.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendValidationError,
  sendPaginated,
} from '../../utils/sendResponse.js';
import { catchAsync } from '../middlewares/errorHandler.js';

// ─────────────────────────────────────────────
// 1. CREATE SCHEME
// POST /api/v1/shops/:shopId/schemes
// ─────────────────────────────────────────────
export const createScheme = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId }       = req.params;
  const organizationId   = req.user.organizationId;
  const userId           = req.user._id;

  const scheme = await schemeService.createScheme(shopId, organizationId, req.body, userId);
  return sendCreated(res, 'Scheme created successfully', scheme);
});

// ─────────────────────────────────────────────
// 2. GET ALL SCHEMES
// GET /api/v1/shops/:shopId/schemes
// ─────────────────────────────────────────────
export const getAllSchemes = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await schemeService.getAllSchemes(shopId, req.query);

  return sendPaginated(
    res,
    result.schemes,
    result.page,
    result.limit,
    result.total,
    'Schemes fetched successfully'
  );
});

// ─────────────────────────────────────────────
// 3. GET SCHEME BY ID
// GET /api/v1/shops/:shopId/schemes/:schemeId
// ─────────────────────────────────────────────
export const getSchemeById = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const scheme = await schemeService.getSchemeById(shopId, schemeId);
  return sendSuccess(res, 200, 'Scheme fetched successfully', scheme);
});

// ─────────────────────────────────────────────
// 4. UPDATE SCHEME
// PUT /api/v1/shops/:shopId/schemes/:schemeId
// ─────────────────────────────────────────────
export const updateScheme = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId, schemeId } = req.params;
  const scheme = await schemeService.updateScheme(shopId, schemeId, req.body, req.user._id);
  return sendSuccess(res, 200, 'Scheme updated successfully', scheme);
});

// ─────────────────────────────────────────────
// 5. DELETE SCHEME
// DELETE /api/v1/shops/:shopId/schemes/:schemeId
// ─────────────────────────────────────────────
export const deleteScheme = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const scheme = await schemeService.deleteScheme(shopId, schemeId, req.user._id);
  return sendSuccess(res, 200, 'Scheme archived successfully', scheme);
});

// ─────────────────────────────────────────────
// 6. UPDATE SCHEME STATUS
// PATCH /api/v1/shops/:shopId/schemes/:schemeId/status
// ─────────────────────────────────────────────
export const updateSchemeStatus = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const { status }           = req.body;

  const scheme = await schemeService.updateSchemeStatus(shopId, schemeId, status, req.user._id);
  return sendSuccess(res, 200, 'Scheme status updated successfully', scheme);
});

// ─────────────────────────────────────────────
// 7. ACTIVATE SCHEME
// PATCH /api/v1/shops/:shopId/schemes/:schemeId/activate
// ─────────────────────────────────────────────
export const activateScheme = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const scheme = await schemeService.activateScheme(shopId, schemeId, req.user._id);
  return sendSuccess(res, 200, 'Scheme activated successfully', scheme);
});

// ─────────────────────────────────────────────
// 8. PAUSE SCHEME
// PATCH /api/v1/shops/:shopId/schemes/:schemeId/pause
// ─────────────────────────────────────────────
export const pauseScheme = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const { reason }           = req.body;
  const scheme = await schemeService.pauseScheme(shopId, schemeId, reason, req.user._id);
  return sendSuccess(res, 200, 'Scheme paused successfully', scheme);
});

// ─────────────────────────────────────────────
// 9. ARCHIVE SCHEME
// PATCH /api/v1/shops/:shopId/schemes/:schemeId/archive
// ─────────────────────────────────────────────
export const archiveScheme = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const scheme = await schemeService.archiveScheme(shopId, schemeId, req.user._id);
  return sendSuccess(res, 200, 'Scheme archived successfully', scheme);
});

// ─────────────────────────────────────────────
// 10. APPROVE SCHEME
// POST /api/v1/shops/:shopId/schemes/:schemeId/approve
// ─────────────────────────────────────────────
export const approveScheme = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const { notes }            = req.body;
  const scheme = await schemeService.approveScheme(shopId, schemeId, req.user._id, notes);
  return sendSuccess(res, 200, 'Scheme approved successfully', scheme);
});

// ─────────────────────────────────────────────
// 11. REJECT SCHEME
// POST /api/v1/shops/:shopId/schemes/:schemeId/reject
// ─────────────────────────────────────────────
export const rejectScheme = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId, schemeId } = req.params;
  const { reason }           = req.body;
  const scheme = await schemeService.rejectScheme(shopId, schemeId, req.user._id, reason);
  return sendSuccess(res, 200, 'Scheme rejected successfully', scheme);
});

// ─────────────────────────────────────────────
// 12. ENROLL CUSTOMER
// POST /api/v1/shops/:shopId/schemes/:schemeId/enroll
// ─────────────────────────────────────────────
export const enrollCustomer = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId, schemeId } = req.params;
  const organizationId       = req.user.organizationId;
  const userId               = req.user._id;

  const enrollment = await schemeService.enrollCustomer(
    shopId, organizationId, schemeId, req.body, userId
  );
  return sendCreated(res, 'Customer enrolled successfully', enrollment);
});

// ─────────────────────────────────────────────
// 13. GET SCHEME ENROLLMENTS
// GET /api/v1/shops/:shopId/schemes/:schemeId/enrollments
// ─────────────────────────────────────────────
export const getSchemeEnrollments = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const result = await schemeService.getSchemeEnrollments(shopId, schemeId, req.query);

  return sendPaginated(
    res,
    result.enrollments,
    result.page,
    result.limit,
    result.total,
    'Enrollments fetched successfully'
  );
});

// ─────────────────────────────────────────────
// 14. GET SINGLE ENROLLMENT
// GET /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId
// ─────────────────────────────────────────────
export const getEnrollmentById = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const enrollment = await schemeService.getEnrollmentById(shopId, enrollmentId);
  return sendSuccess(res, 200, 'Enrollment fetched successfully', enrollment);
});

// ─────────────────────────────────────────────
// 15. UPDATE ENROLLMENT
// PUT /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId
// ─────────────────────────────────────────────
export const updateEnrollment = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const enrollment = await schemeService.updateEnrollment(
    shopId, enrollmentId, req.body, req.user._id
  );
  return sendSuccess(res, 200, 'Enrollment updated successfully', enrollment);
});

// ─────────────────────────────────────────────
// 16. CANCEL ENROLLMENT
// DELETE /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId
// ─────────────────────────────────────────────
export const cancelEnrollment = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const enrollment = await schemeService.cancelEnrollment(
    shopId, enrollmentId, req.body, req.user._id
  );
  return sendSuccess(res, 200, 'Enrollment cancelled successfully', enrollment);
});

// ─────────────────────────────────────────────
// 17. RECORD INSTALLMENT PAYMENT
// POST /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/pay
// ─────────────────────────────────────────────
export const recordPayment = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId, enrollmentId } = req.params;
  const organizationId           = req.user.organizationId;

  const result = await schemeService.recordInstallmentPayment(
    shopId, organizationId, enrollmentId, req.body, req.user._id
  );
  return sendCreated(res, 'Payment recorded successfully', result);
});

// ─────────────────────────────────────────────
// 18. GET ENROLLMENT PAYMENTS
// GET /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/payments
// ─────────────────────────────────────────────
export const getEnrollmentPayments = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const payments = await schemeService.getEnrollmentPayments(shopId, enrollmentId);
  return sendSuccess(res, 200, 'Payments fetched successfully', payments);
});

// ─────────────────────────────────────────────
// 19. GET INSTALLMENT SCHEDULE
// GET /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/schedule
// ─────────────────────────────────────────────
export const getInstallmentSchedule = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const schedule = await schemeService.getInstallmentSchedule(shopId, enrollmentId);
  return sendSuccess(res, 200, 'Schedule fetched successfully', schedule);
});

// ─────────────────────────────────────────────
// 20. CALCULATE MATURITY
// GET /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/maturity
// ─────────────────────────────────────────────
export const calculateMaturity = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const maturity = await schemeService.calculateMaturityValue(shopId, enrollmentId);
  return sendSuccess(res, 200, 'Maturity value calculated successfully', maturity);
});

// ─────────────────────────────────────────────
// 21. MATURE ENROLLMENT
// POST /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/mature
// ─────────────────────────────────────────────
export const matureEnrollment = catchAsync(async (req, res) => {
  const { shopId, enrollmentId } = req.params;
  const enrollment = await schemeService.matureEnrollment(shopId, enrollmentId, req.user._id);
  return sendSuccess(res, 200, 'Enrollment matured successfully', enrollment);
});

// ─────────────────────────────────────────────
// 22. REDEEM ENROLLMENT
// POST /api/v1/shops/:shopId/schemes/enrollments/:enrollmentId/redeem
// ─────────────────────────────────────────────
export const redeemEnrollment = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors.array());

  const { shopId, enrollmentId } = req.params;
  const enrollment = await schemeService.redeemEnrollment(
    shopId, enrollmentId, req.body, req.user._id
  );
  return sendSuccess(res, 200, 'Enrollment redeemed successfully', enrollment);
});

// ─────────────────────────────────────────────
// 23. CUSTOMER ENROLLMENTS
// GET /api/v1/shops/:shopId/schemes/customer/:customerId/enrollments
// ─────────────────────────────────────────────
export const getCustomerEnrollments = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const result = await schemeService.getCustomerEnrollments(shopId, customerId, req.query);

  return sendPaginated(
    res,
    result.enrollments,
    result.page,
    result.limit,
    result.total,
    'Customer enrollments fetched successfully'
  );
});

// ─────────────────────────────────────────────
// 24. CUSTOMER SCHEME SUMMARY
// GET /api/v1/shops/:shopId/schemes/customer/:customerId/summary
// ─────────────────────────────────────────────
export const getCustomerSchemeSummary = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const summary = await schemeService.getCustomerSchemeSummary(shopId, customerId);
  return sendSuccess(res, 200, 'Customer scheme summary fetched successfully', summary);
});

// ─────────────────────────────────────────────
// 25. SCHEME ANALYTICS
// GET /api/v1/shops/:shopId/schemes/analytics
// ─────────────────────────────────────────────
export const getSchemeAnalytics = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;
  const analytics = await schemeService.getSchemeAnalytics(shopId, organizationId, req.query);
  return sendSuccess(res, 200, 'Scheme analytics fetched successfully', analytics);
});

// ─────────────────────────────────────────────
// 26. SCHEME DASHBOARD
// GET /api/v1/shops/:shopId/schemes/dashboard
// ─────────────────────────────────────────────
export const getSchemeDashboard = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const dashboard = await schemeService.getSchemeDashboard(shopId);
  return sendSuccess(res, 200, 'Dashboard fetched successfully', dashboard);
});

// ─────────────────────────────────────────────
// 27. SCHEME SPECIFIC ANALYTICS
// GET /api/v1/shops/:shopId/schemes/:schemeId/analytics
// ─────────────────────────────────────────────
export const getSchemeSpecificAnalytics = catchAsync(async (req, res) => {
  const { shopId, schemeId } = req.params;
  const analytics = await schemeService.getSchemeSpecificAnalytics(shopId, schemeId);
  return sendSuccess(res, 200, 'Scheme analytics fetched successfully', analytics);
});

// ─────────────────────────────────────────────
// 28. DUES TODAY
// GET /api/v1/shops/:shopId/schemes/dues/today
// ─────────────────────────────────────────────
export const getDuesToday = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const dues = await schemeService.getDuesToday(shopId);
  return sendSuccess(res, 200, "Today's dues fetched successfully", dues, { count: dues.length });
});

// ─────────────────────────────────────────────
// 29. OVERDUE
// GET /api/v1/shops/:shopId/schemes/dues/overdue
// ─────────────────────────────────────────────
export const getOverdueDues = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const dues = await schemeService.getOverdueDues(shopId);
  return sendSuccess(res, 200, 'Overdue dues fetched successfully', dues, { count: dues.length });
});

// ─────────────────────────────────────────────
// 30. UPCOMING DUES
// GET /api/v1/shops/:shopId/schemes/dues/upcoming
// ─────────────────────────────────────────────
export const getUpcomingDues = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { days }   = req.query;
  const dues = await schemeService.getUpcomingDues(shopId, days ? parseInt(days) : 7);
  return sendSuccess(res, 200, 'Upcoming dues fetched successfully', dues, { count: dues.length });
});

// ─────────────────────────────────────────────
// 31. SEND REMINDERS
// POST /api/v1/shops/:shopId/schemes/dues/send-reminders
// ─────────────────────────────────────────────
export const sendPaymentReminders = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  if (!req.body.enrollmentIds || req.body.enrollmentIds.length === 0) {
    return sendBadRequest(res, 'Enrollment IDs are required');
  }

  const result = await schemeService.sendPaymentReminders(
    shopId, organizationId, req.body, req.user._id
  );
  return sendSuccess(res, 200, `Reminders sent to ${result.sentCount} customers`, result);
});

// ─────────────────────────────────────────────
// 32. ACTIVE SCHEMES
// GET /api/v1/shops/:shopId/schemes/active
// ─────────────────────────────────────────────
export const getActiveSchemes = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const schemes = await schemeService.getActiveSchemes(shopId);
  return sendSuccess(res, 200, 'Active schemes fetched successfully', schemes);
});

// ─────────────────────────────────────────────
// 33. FEATURED SCHEMES
// GET /api/v1/shops/:shopId/schemes/featured
// ─────────────────────────────────────────────
export const getFeaturedSchemes = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const schemes = await schemeService.getFeaturedSchemes(shopId);
  return sendSuccess(res, 200, 'Featured schemes fetched successfully', schemes);
});

// ─────────────────────────────────────────────
// 34. EXPIRING SOON
// GET /api/v1/shops/:shopId/schemes/expiring-soon
// ─────────────────────────────────────────────
export const getExpiringSoon = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { days }   = req.query;
  const schemes = await schemeService.getExpiringSoonSchemes(shopId, days ? parseInt(days) : 30);
  return sendSuccess(res, 200, 'Expiring schemes fetched successfully', schemes);
});

// ─────────────────────────────────────────────
// 35. SCHEMES BY TYPE
// GET /api/v1/shops/:shopId/schemes/by-type/:schemeType
// ─────────────────────────────────────────────
export const getSchemesByType = catchAsync(async (req, res) => {
  const { shopId, schemeType } = req.params;
  const schemes = await schemeService.getSchemesByType(shopId, schemeType);
  return sendSuccess(res, 200, 'Schemes fetched successfully', schemes);
});

// ─────────────────────────────────────────────
// 36. SEARCH SCHEMES
// GET /api/v1/shops/:shopId/schemes/search
// ─────────────────────────────────────────────
export const searchSchemes = catchAsync(async (req, res) => {
  const { shopId }   = req.params;
  const { q, limit } = req.query;

  if (!q) return sendBadRequest(res, 'Search query is required');

  const schemes = await schemeService.searchSchemes(shopId, q, limit);
  return sendSuccess(res, 200, 'Search results fetched successfully', schemes);
});

// ─────────────────────────────────────────────
// 37. BULK SEND REMINDERS
// POST /api/v1/shops/:shopId/schemes/bulk-send-reminders
// ─────────────────────────────────────────────
export const bulkSendReminders = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const result = await schemeService.bulkSendReminders(
    shopId, organizationId, req.body, req.user._id
  );
  return sendSuccess(res, 200, `Reminders sent to ${result.sentCount} customers`, result);
});

// ─────────────────────────────────────────────
// 38. BULK EXPORT
// POST /api/v1/shops/:shopId/schemes/bulk-export
// ─────────────────────────────────────────────
export const bulkExportSchemes = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await schemeService.bulkExportSchemes(shopId, req.body);
  return sendSuccess(res, 200, 'Export data prepared successfully', result);
});

// ─────────────────────────────────────────────
// 39. MATURING SOON
// GET /api/v1/shops/:shopId/schemes/maturing-soon
// ─────────────────────────────────────────────
export const getMaturingSoon = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { days }   = req.query;
  const enrollments = await schemeService.getMaturingSoon(shopId, days ? parseInt(days) : 30, req.query);
  return sendSuccess(res, 200, 'Maturing enrollments fetched successfully', enrollments);
});

// ─────────────────────────────────────────────
// 40. MATURED ENROLLMENTS
// GET /api/v1/shops/:shopId/schemes/matured
// ─────────────────────────────────────────────
export const getMaturedEnrollments = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await schemeService.getMaturedEnrollments(shopId, req.query);

  return sendPaginated(
    res,
    result.enrollments,
    result.page,
    result.limit,
    result.total,
    'Matured enrollments fetched successfully'
  );
});