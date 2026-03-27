// FILE: src/api/metal-rates/metalRate.controller.js
import metalRateService from './metalRate.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { sendSuccess, sendNoContent } from '../../utils/sendResponse.js';
import { ValidationError } from '../../utils/AppError.js';

// POST /api/v1/shops/:shopId/metal-rates
export const createOrUpdateTodayRate = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const userId = req.user._id;

  const result = await metalRateService.createOrUpdateTodayRate(shopId, req.body, userId);

  const statusCode = result.data.isNew === false ? 200 : 201;

  return sendSuccess(res, statusCode, result.message, result.data);
});

// GET /api/v1/shops/:shopId/metal-rates/current
export const getCurrentRate = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const result = await metalRateService.getCurrentRate(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    cached: result.cached,
  });
});

// GET /api/v1/shops/:shopId/metal-rates/history
export const getRateHistory = catchAsync(async (req, res) => {
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

// GET /api/v1/shops/:shopId/metal-rates/date/:date
export const getRateByDate = catchAsync(async (req, res) => {
  const { shopId, date } = req.params;

  if (!date || isNaN(Date.parse(date))) {
    throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
  }

  const result = await metalRateService.getRateByDate(shopId, date);

  return sendSuccess(res, 200, result.message, result.data);
});
// GET /api/v1/shops/:shopId/metal-rates/compare
export const compareRates = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { fromDate, toDate } = req.query;

  if (!fromDate || !toDate) {
    throw new ValidationError('Both fromDate and toDate are required');
  }

  if (isNaN(Date.parse(fromDate)) || isNaN(Date.parse(toDate))) {
    throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
  }

  if (new Date(toDate) < new Date(fromDate)) {
    throw new ValidationError('toDate must be greater than or equal to fromDate');
  }

  const result = await metalRateService.compareRates(shopId, fromDate, toDate);

  return sendSuccess(res, 200, result.message, result.data);
});

// GET /api/v1/shops/:shopId/metal-rates/trends
export const getTrendChartData = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { metalType = 'gold', days = 90 } = req.query;

  const daysNum = parseInt(days);

  if (isNaN(daysNum) || daysNum < 1) {
    throw new ValidationError('Days must be a positive number');
  }

  const result = await metalRateService.getTrendChartData(shopId, metalType, daysNum);

  return sendSuccess(res, 200, result.message, result.data, {
    cached: result.cached,
  });
});

// POST /api/v1/organizations/:organizationId/metal-rates/sync
export const syncToAllShops = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const userId = req.user._id;

  if (req.user.role !== 'super_admin' && req.user.organizationId.toString() !== organizationId) {
    throw new ValidationError('You can only sync rates for your own organization');
  }

  const result = await metalRateService.syncToAllShops(organizationId, req.body, userId);

  const statusCode = result.data.failedShops > 0 ? 207 : 200; // 207 Multi-Status

  return sendSuccess(res, statusCode, result.message, result.data);
});

// GET /api/v1/organizations/:organizationId/metal-rates/current
export const getOrganizationRate = catchAsync(async (req, res) => {
  const { organizationId } = req.params;

  const result = await metalRateService.getOrganizationRate(organizationId);

  return sendSuccess(res, 200, result.message, result.data);
});

// PATCH /api/v1/metal-rates/:rateId/deactivate
export const deactivateRate = catchAsync(async (req, res) => {
  const { rateId } = req.params;
  const userId = req.user._id;

  const result = await metalRateService.deactivateRate(rateId, userId);

  return sendSuccess(res, 200, result.message, result.data);
});

// DELETE /api/v1/metal-rates/:rateId
export const deleteRate = catchAsync(async (req, res) => {
  const { rateId } = req.params;
  const userId = req.user._id;

  await metalRateService.deleteRate(rateId, userId);

  return sendNoContent(res);
});

// GET /api/v1/shops/:shopId/metal-rates/latest
export const getLatestRates = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  const result = await metalRateService.getRateHistory(shopId, {
    page: 1,
    limit,
    sort: '-rateDate',
  });

  return sendSuccess(res, 200, 'Latest rates retrieved', result.data);
});

// GET /api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity
export const getRateForPurity = catchAsync(async (req, res) => {
  const { shopId, metalType, purity } = req.params;

  const result = await metalRateService.getCurrentRate(shopId);
  const currentRate = result.data;

  if (!currentRate) {
    throw new ValidationError('No current rate found');
  }

  const rateForPurity = currentRate.getRateForPurity(metalType, purity);

  if (!rateForPurity) {
    throw new ValidationError(`Invalid metal type or purity: ${metalType} ${purity}`);
  }

  return sendSuccess(res, 200, 'Rate for purity retrieved', {
    metalType,
    purity,
    buyingRate: rateForPurity.buyingRate,
    sellingRate: rateForPurity.sellingRate,
    rateDate: currentRate.rateDate,
  });
});

// GET /api/v1/shops/:shopId/metal-rates/average
export const getAverageRate = catchAsync(async (req, res) => {
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