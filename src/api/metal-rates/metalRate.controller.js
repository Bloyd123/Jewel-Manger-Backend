// ============================================================================
// FILE: src/api/metal-rates/metalRate.controller.js
// Metal Rate Management - API Controllers
// ============================================================================

import metalRateService from './metalRate.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/sendResponse.js';
import { ValidationError } from '../../utils/AppError.js';

class MetalRateController {
  // =========================================================================
  // CREATE OR UPDATE TODAY'S RATE
  // POST /api/v1/shops/:shopId/metal-rates
  // Permission: canUpdateMetalRates
  // =========================================================================
  createOrUpdateTodayRate = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const userId = req.user._id;

    const result = await metalRateService.createOrUpdateTodayRate(
      shopId,
      req.body,
      userId
    );

    const statusCode = result.data.isNew === false ? 200 : 201;

    return sendSuccess(res, statusCode, result.message, result.data);
  });

  // =========================================================================
  // GET CURRENT RATE (MOST USED)
  // GET /api/v1/shops/:shopId/metal-rates/current
  // Permission: Public (any shop access)
  // =========================================================================
  getCurrentRate = catchAsync(async (req, res) => {
    const { shopId } = req.params;

    const result = await metalRateService.getCurrentRate(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      cached: result.cached,
    });
  });

  // =========================================================================
  // GET RATE HISTORY
  // GET /api/v1/shops/:shopId/metal-rates/history
  // Permission: canViewReports
  // Query params: ?startDate=2024-11-01&endDate=2024-11-10&page=1&limit=10
  // =========================================================================
  getRateHistory = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate, page, limit, sort } = req.query;

    const result = await metalRateService.getRateHistory(shopId, {
      startDate,
      endDate,
      page,
      limit,
      sort,
    });

    return sendSuccess(res, 200, result.message, result.data, result.meta);
  });

  // =========================================================================
  // GET RATE BY SPECIFIC DATE
  // GET /api/v1/shops/:shopId/metal-rates/date/:date
  // Permission: canViewReports
  // =========================================================================
  getRateByDate = catchAsync(async (req, res) => {
    const { shopId, date } = req.params;

    // Validate date format
    if (!date || isNaN(Date.parse(date))) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    const result = await metalRateService.getRateByDate(shopId, date);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // =========================================================================
  // COMPARE RATES BETWEEN TWO DATES
  // GET /api/v1/shops/:shopId/metal-rates/compare
  // Permission: canViewReports
  // Query params: ?fromDate=2024-11-01&toDate=2024-11-10
  // =========================================================================
  compareRates = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { fromDate, toDate } = req.query;

    // Validate required parameters
    if (!fromDate || !toDate) {
      throw new ValidationError('Both fromDate and toDate are required');
    }

    // Validate date formats
    if (isNaN(Date.parse(fromDate)) || isNaN(Date.parse(toDate))) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    // Validate date logic
    if (new Date(toDate) < new Date(fromDate)) {
      throw new ValidationError('toDate must be greater than or equal to fromDate');
    }

    const result = await metalRateService.compareRates(shopId, fromDate, toDate);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // =========================================================================
  // GET TREND CHART DATA (NEW FEATURE)
  // GET /api/v1/shops/:shopId/metal-rates/trends
  // Permission: canViewReports
  // Query params: ?metalType=gold&days=90
  // =========================================================================
  getTrendChartData = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { metalType = 'gold', days = 90 } = req.query;

    // Validate days parameter
    const validDays = [7, 30, 90, 180, 365];
    const daysNum = parseInt(days);

    if (isNaN(daysNum) || daysNum < 1) {
      throw new ValidationError('Days must be a positive number');
    }

    const result = await metalRateService.getTrendChartData(
      shopId,
      metalType,
      daysNum
    );

    return sendSuccess(res, 200, result.message, result.data, {
      cached: result.cached,
    });
  });

  // =========================================================================
  // MULTI-SHOP SYNC (ORGANIZATION LEVEL)
  // POST /api/v1/organizations/:organizationId/metal-rates/sync
  // Permission: super_admin, org_admin only
  // =========================================================================
  syncToAllShops = catchAsync(async (req, res) => {
    const { organizationId } = req.params;
    const userId = req.user._id;

    // Verify user belongs to this organization (unless super_admin)
    if (
      req.user.role !== 'super_admin' &&
      req.user.organizationId.toString() !== organizationId
    ) {
      throw new ValidationError('You can only sync rates for your own organization');
    }

    const result = await metalRateService.syncToAllShops(
      organizationId,
      req.body,
      userId
    );

    const statusCode = result.data.failedShops > 0 ? 207 : 200; // 207 Multi-Status

    return sendSuccess(res, statusCode, result.message, result.data);
  });

  // =========================================================================
  // GET ORGANIZATION MASTER RATE
  // GET /api/v1/organizations/:organizationId/metal-rates/current
  // Permission: org_admin, super_admin
  // =========================================================================
  getOrganizationRate = catchAsync(async (req, res) => {
    const { organizationId } = req.params;

    const result = await metalRateService.getOrganizationRate(organizationId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // =========================================================================
  // DEACTIVATE RATE
  // PATCH /api/v1/metal-rates/:rateId/deactivate
  // Permission: canUpdateMetalRates
  // =========================================================================
  deactivateRate = catchAsync(async (req, res) => {
    const { rateId } = req.params;
    const userId = req.user._id;

    const result = await metalRateService.deactivateRate(rateId, userId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // =========================================================================
  // SOFT DELETE RATE
  // DELETE /api/v1/metal-rates/:rateId
  // Permission: canManageShopSettings (or super_admin, org_admin)
  // =========================================================================
  deleteRate = catchAsync(async (req, res) => {
    const { rateId } = req.params;
    const userId = req.user._id;

    await metalRateService.deleteRate(rateId, userId);

    return sendNoContent(res);
  });

  // =========================================================================
  // GET LATEST RATES (RECENT 10)
  // GET /api/v1/shops/:shopId/metal-rates/latest
  // Permission: canViewDashboard
  // =========================================================================
  getLatestRates = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const result = await metalRateService.getRateHistory(shopId, {
      page: 1,
      limit,
      sort: '-rateDate',
    });

    return sendSuccess(res, 200, 'Latest rates retrieved', result.data);
  });

  // =========================================================================
  // GET RATE FOR SPECIFIC PURITY
  // GET /api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity
  // Permission: Public (any shop access)
  // Example: /api/v1/shops/123/metal-rates/current/purity/gold/22K
  // =========================================================================
  getRateForPurity = catchAsync(async (req, res) => {
    const { shopId, metalType, purity } = req.params;

    const result = await metalRateService.getCurrentRate(shopId);
    const currentRate = result.data;

    if (!currentRate) {
      throw new ValidationError('No current rate found');
    }

    const rateForPurity = currentRate.getRateForPurity(metalType, purity);

    if (!rateForPurity) {
      throw new ValidationError(
        `Invalid metal type or purity: ${metalType} ${purity}`
      );
    }

    return sendSuccess(res, 200, 'Rate for purity retrieved', {
      metalType,
      purity,
      buyingRate: rateForPurity.buyingRate,
      sellingRate: rateForPurity.sellingRate,
      rateDate: currentRate.rateDate,
    });
  });

  // =========================================================================
  // GET AVERAGE RATE (30 DAYS)
  // GET /api/v1/shops/:shopId/metal-rates/average
  // Permission: canViewReports
  // Query params: ?metalType=gold&purity=24K&days=30
  // =========================================================================
  getAverageRate = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { metalType = 'gold', purity = '24K', days = 30 } = req.query;

    const daysNum = parseInt(days);

    if (isNaN(daysNum) || daysNum < 1) {
      throw new ValidationError('Days must be a positive number');
    }

    const result = await metalRateService.getRateHistory(shopId, {
      page: 1,
      limit: daysNum,
      sort: '-rateDate',
    });

    if (!result.data || result.data.length === 0) {
      throw new ValidationError('No rate data available for average calculation');
    }

    // Calculate average
    let totalBuying = 0;
    let totalSelling = 0;

    result.data.forEach(rate => {
      const rateForPurity = rate.getRateForPurity(metalType, purity);
      if (rateForPurity) {
        totalBuying += rateForPurity.buyingRate;
        totalSelling += rateForPurity.sellingRate;
      }
    });

    const count = result.data.length;

    return sendSuccess(res, 200, 'Average rate calculated', {
      metalType,
      purity,
      period: `${count} days`,
      averageBuyingRate: parseFloat((totalBuying / count).toFixed(2)),
      averageSellingRate: parseFloat((totalSelling / count).toFixed(2)),
      samples: count,
    });
  });
}

// Export controller instance
export default new MetalRateController();