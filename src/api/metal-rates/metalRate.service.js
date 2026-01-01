// ============================================================================
// FILE: src/api/metal-rates/metalRate.service.js
// Metal Rate Management - Business Logic Layer
// ============================================================================

import MetalRate from '../../models/MetalRate.js';
import JewelryShop from '../../models/Shop.js';
import cache from '../../utils/cache.js';
import logger from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/AppError.js';

class MetalRateService {
  // =========================================================================
  // CREATE OR UPDATE TODAY'S RATE
  // =========================================================================
  async createOrUpdateTodayRate(shopId, rateData, userId) {
    try {
      // 1. Normalize today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Verify shop exists and get organizationId
      const shop = await JewelryShop.findById(shopId);
      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      // 3. Check if today's rate already exists
      const existingRate = await MetalRate.findOne({
        shopId,
        rateDate: { $gte: today },
        deletedAt: null,
      });

      let metalRate;
      let isUpdate = false;

      if (existingRate) {
        // UPDATE EXISTING RATE
        isUpdate = true;

        // Update all rate fields
        existingRate.gold = rateData.gold;
        existingRate.silver = rateData.silver;
        if (rateData.platinum) existingRate.platinum = rateData.platinum;
        if (rateData.weightUnit) existingRate.weightUnit = rateData.weightUnit;
        if (rateData.currency) existingRate.currency = rateData.currency;
        if (rateData.rateSource) existingRate.rateSource = rateData.rateSource;
        if (rateData.notes) existingRate.notes = rateData.notes;
        if (rateData.internalNotes) existingRate.internalNotes = rateData.internalNotes;
        if (rateData.marketReference) existingRate.marketReference = rateData.marketReference;

        existingRate.updatedBy = userId;

        // Pre-save middleware will handle:
        // - baseRates calculation
        // - autoConvertedRates calculation
        // - trendData recalculation
        // - rate changes recalculation
        metalRate = await existingRate.save();
      } else {
        // CREATE NEW RATE
        metalRate = await MetalRate.create({
          shopId,
          organizationId: shop.organizationId,
          rateDate: today,
          gold: rateData.gold,
          silver: rateData.silver,
          platinum: rateData.platinum || { buyingRate: 0, sellingRate: 0 },
          weightUnit: rateData.weightUnit || 'gram',
          currency: rateData.currency || 'INR',
          rateSource: rateData.rateSource || 'manual',
          notes: rateData.notes,
          internalNotes: rateData.internalNotes,
          marketReference: rateData.marketReference,
          isCurrent: true,
          isActive: true,
          validFrom: new Date(),
          createdBy: userId,
        });

        // Pre-save middleware automatically:
        // - Marks all old rates as NOT current
        // - Calculates baseRates
        // - Calculates autoConvertedRates
        // - Calculates moving averages (ma7, ma30, ma90)
        // - Calculates rate changes from yesterday
      }

      // 4. Update shop's quick access settings
      await this.updateShopSettings(shop, metalRate);

      // 5. Invalidate caches
      await this.invalidateCaches(shopId);

      // 6. Log activity
      await eventLogger.logActivity({
        userId,
        organizationId: shop.organizationId,
        shopId,
        action: isUpdate ? 'update' : 'create',
        module: 'metal_rate',
        description: `Metal rates ${isUpdate ? 'updated' : 'created'} for ${today.toDateString()}`,
        level: 'success',
        status: 'success',
        metadata: {
          rateId: metalRate._id,
          gold24K: metalRate.gold.gold24K.sellingRate,
          gold22K: metalRate.gold.gold22K.sellingRate,
          silver999: metalRate.silver.pure.sellingRate,
          changes: metalRate.changes,
          isUpdate,
        },
      });

      logger.info(`Metal rate ${isUpdate ? 'updated' : 'created'}`, {
        shopId,
        rateId: metalRate._id,
        userId,
      });

      return {
        success: true,
        data: metalRate,
        message: `Metal rates ${isUpdate ? 'updated' : 'created'} successfully`,
      };
    } catch (error) {
      logger.error('Error creating/updating metal rate:', error);
      throw error;
    }
  }

  // =========================================================================
  // GET CURRENT RATE (MOST USED - HEAVILY CACHED)
  // =========================================================================
  async getCurrentRate(shopId) {
    try {
      // 1. Try cache first
      const cacheKey = `metal-rates:${shopId}:current`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        logger.debug('Metal rate cache hit', { shopId });
        return {
          success: true,
          data: cached,
          message: 'Current metal rates',
          cached: true,
        };
      }

      // 2. Query database if cache miss
      const currentRate = await MetalRate.getCurrentRate(shopId);

      if (!currentRate) {
        throw new NotFoundError("No current metal rate found. Please update today's rates.");
      }

      // 3. Store in cache (1 hour)
      await cache.set(cacheKey, currentRate, 3600);

      logger.debug('Metal rate cache miss - stored in cache', { shopId });

      return {
        success: true,
        data: currentRate,
        message: 'Current metal rates',
        cached: false,
      };
    } catch (error) {
      logger.error('Error getting current rate:', error);
      throw error;
    }
  }

  // =========================================================================
  // GET RATE HISTORY WITH PAGINATION
  // =========================================================================
  async getRateHistory(shopId, filters = {}) {
    try {
      const { startDate, endDate, page = 1, limit = 10, sort = '-rateDate' } = filters;

      // Build query
      const query = {
        shopId,
        deletedAt: null,
      };

      // Add date range filter
      if (startDate || endDate) {
        query.rateDate = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.rateDate.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.rateDate.$lte = end;
        }
      }

      // Execute paginated query
      const skip = (page - 1) * limit;
      const [rates, total] = await Promise.all([
        MetalRate.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select(
            'rateDate gold silver platinum changes baseRates trendData weightUnit currency isCurrent'
          ),
        MetalRate.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: rates,
        message: 'Rate history retrieved successfully',
        meta: {
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            pageSize: parseInt(limit),
            totalItems: total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      logger.error('Error getting rate history:', error);
      throw error;
    }
  }

  // =========================================================================
  // GET RATE BY SPECIFIC DATE
  // =========================================================================
  async getRateByDate(shopId, date) {
    try {
      // Normalize date
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const rate = await MetalRate.findOne({
        shopId,
        rateDate: { $gte: startOfDay, $lte: endOfDay },
        deletedAt: null,
      });

      if (!rate) {
        throw new NotFoundError(`No rate found for date: ${date}`);
      }

      return {
        success: true,
        data: rate,
        message: `Rate for ${date} retrieved successfully`,
      };
    } catch (error) {
      logger.error('Error getting rate by date:', error);
      throw error;
    }
  }

  // =========================================================================
  // COMPARE RATES BETWEEN TWO DATES
  // =========================================================================
  async compareRates(shopId, fromDate, toDate) {
    try {
      // Get rates for both dates
      const [fromRate, toRate] = await Promise.all([
        MetalRate.getRateByDate(shopId, new Date(fromDate)),
        MetalRate.getRateByDate(shopId, new Date(toDate)),
      ]);

      if (!fromRate || !toRate) {
        throw new NotFoundError('Rates not found for one or both dates');
      }

      // Calculate comparisons
      const comparison = {
        fromDate,
        toDate,
        daysDifference: Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)),
        gold24K: this.calculateRateChange(
          fromRate.gold.gold24K.sellingRate,
          toRate.gold.gold24K.sellingRate
        ),
        gold22K: this.calculateRateChange(
          fromRate.gold.gold22K.sellingRate,
          toRate.gold.gold22K.sellingRate
        ),
        gold18K: this.calculateRateChange(
          fromRate.gold.gold18K.sellingRate,
          toRate.gold.gold18K.sellingRate
        ),
        silver999: this.calculateRateChange(
          fromRate.silver.pure.sellingRate,
          toRate.silver.pure.sellingRate
        ),
        platinum: this.calculateRateChange(
          fromRate.platinum.sellingRate,
          toRate.platinum.sellingRate
        ),
        trendComparison: {
          gold: {
            ma7Change: toRate.trendData?.gold?.ma7 - fromRate.trendData?.gold?.ma7 || 0,
            ma30Change: toRate.trendData?.gold?.ma30 - fromRate.trendData?.gold?.ma30 || 0,
            ma90Change: toRate.trendData?.gold?.ma90 - fromRate.trendData?.gold?.ma90 || 0,
          },
          silver: {
            ma7Change: toRate.trendData?.silver?.ma7 - fromRate.trendData?.silver?.ma7 || 0,
            ma30Change: toRate.trendData?.silver?.ma30 - fromRate.trendData?.silver?.ma30 || 0,
            ma90Change: toRate.trendData?.silver?.ma90 - fromRate.trendData?.silver?.ma90 || 0,
          },
        },
      };

      return {
        success: true,
        data: comparison,
        message: 'Rate comparison completed',
      };
    } catch (error) {
      logger.error('Error comparing rates:', error);
      throw error;
    }
  }

  // =========================================================================
  // GET TREND CHART DATA (NEW FEATURE)
  // =========================================================================
  async getTrendChartData(shopId, metalType = 'gold', days = 90) {
    try {
      // Validate metalType
      if (!['gold', 'silver', 'platinum'].includes(metalType)) {
        throw new ValidationError('Invalid metal type. Must be: gold, silver, or platinum');
      }

      // Try cache first
      const cacheKey = `metal-rates:${shopId}:trends:${metalType}:${days}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        return {
          success: true,
          data: cached,
          message: 'Trend data retrieved from cache',
          cached: true,
        };
      }

      // Get trend data from database
      const trendData = await MetalRate.getTrendChartData(shopId, metalType, days);

      if (!trendData || trendData.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No trend data available',
        };
      }

      // Format response
      const response = {
        metalType,
        period: days,
        dataPoints: trendData.length,
        trendData: trendData.map(item => ({
          date: item.date,
          rate: item.rate,
          ma7: item.ma7,
          ma30: item.ma30,
          ma90: item.ma90,
        })),
        summary: {
          currentRate: trendData[trendData.length - 1]?.rate || 0,
          startRate: trendData[0]?.rate || 0,
          highestRate: Math.max(...trendData.map(d => d.rate)),
          lowestRate: Math.min(...trendData.map(d => d.rate)),
          averageRate: trendData.reduce((sum, d) => sum + d.rate, 0) / trendData.length,
        },
      };

      // Cache for 2 hours
      await cache.set(cacheKey, response, 7200);

      return {
        success: true,
        data: response,
        message: 'Trend data retrieved successfully',
        cached: false,
      };
    } catch (error) {
      logger.error('Error getting trend data:', error);
      throw error;
    }
  }

  // =========================================================================
  // MULTI-SHOP SYNC (ORGANIZATION LEVEL)
  // =========================================================================
  async syncToAllShops(organizationId, rateData, userId) {
    try {
      // 1. Get all active shops in organization
      const shops = await JewelryShop.find({
        organizationId,
        isActive: true,
        deletedAt: null,
      });

      if (!shops || shops.length === 0) {
        throw new NotFoundError('No active shops found for this organization');
      }

      logger.info(`Starting multi-shop sync for ${shops.length} shops`, {
        organizationId,
        userId,
      });

      // 2. Create/update rates for all shops
      const results = await Promise.allSettled(
        shops.map(shop => this.createOrUpdateTodayRate(shop._id, rateData, userId))
      );

      // 3. Analyze results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      const failureDetails = failed.map((result, index) => ({
        shopId: shops[index]._id,
        shopName: shops[index].name,
        error: result.reason?.message || 'Unknown error',
      }));

      // 4. Log sync activity
      await eventLogger.logActivity({
        userId,
        organizationId,
        action: 'sync',
        module: 'metal_rate',
        description: `Synced rates to ${successful.length}/${shops.length} shops`,
        level: failed.length > 0 ? 'warn' : 'success',
        status: failed.length > 0 ? 'partial' : 'success',
        metadata: {
          totalShops: shops.length,
          successfulShops: successful.length,
          failedShops: failed.length,
          failures: failureDetails,
        },
      });

      return {
        success: true,
        data: {
          totalShops: shops.length,
          syncedShops: successful.length,
          failedShops: failed.length,
          failures: failureDetails,
        },
        message:
          failed.length > 0
            ? `Rates synced with ${failed.length} failure(s)`
            : 'Rates synced to all shops successfully',
      };
    } catch (error) {
      logger.error('Error syncing rates to shops:', error);
      throw error;
    }
  }

  // =========================================================================
  // GET ORGANIZATION MASTER RATE
  // =========================================================================
  async getOrganizationRate(organizationId) {
    try {
      const orgRate = await MetalRate.getOrganizationRate(organizationId);

      if (!orgRate) {
        throw new NotFoundError('No organization master rate found');
      }

      return {
        success: true,
        data: orgRate,
        message: 'Organization master rate retrieved',
      };
    } catch (error) {
      logger.error('Error getting organization rate:', error);
      throw error;
    }
  }

  // =========================================================================
  // DEACTIVATE RATE
  // =========================================================================
  async deactivateRate(rateId, userId) {
    try {
      const rate = await MetalRate.findById(rateId);

      if (!rate) {
        throw new NotFoundError('Metal rate not found');
      }

      await rate.deactivate();

      // Invalidate caches
      await this.invalidateCaches(rate.shopId);

      // Log activity
      await eventLogger.logActivity({
        userId,
        organizationId: rate.organizationId,
        shopId: rate.shopId,
        action: 'deactivate',
        module: 'metal_rate',
        description: `Metal rate deactivated for ${rate.rateDate.toDateString()}`,
        level: 'info',
        status: 'success',
        metadata: { rateId: rate._id },
      });

      return {
        success: true,
        data: rate,
        message: 'Metal rate deactivated successfully',
      };
    } catch (error) {
      logger.error('Error deactivating rate:', error);
      throw error;
    }
  }

  // =========================================================================
  // SOFT DELETE RATE
  // =========================================================================
  async deleteRate(rateId, userId) {
    try {
      const rate = await MetalRate.findById(rateId);

      if (!rate) {
        throw new NotFoundError('Metal rate not found');
      }

      // Cannot delete current rate
      if (rate.isCurrent) {
        throw new ConflictError('Cannot delete current rate. Please create a new rate first.');
      }

      await rate.softDelete();

      // Invalidate caches
      await this.invalidateCaches(rate.shopId);

      // Log activity
      await eventLogger.logActivity({
        userId,
        organizationId: rate.organizationId,
        shopId: rate.shopId,
        action: 'delete',
        module: 'metal_rate',
        description: `Metal rate deleted for ${rate.rateDate.toDateString()}`,
        level: 'warn',
        status: 'success',
        metadata: { rateId: rate._id },
      });

      return {
        success: true,
        message: 'Metal rate deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting rate:', error);
      throw error;
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Calculate rate change between two values
   */
  calculateRateChange(oldRate, newRate) {
    const change = newRate - oldRate;
    const changePercentage = oldRate !== 0 ? (change / oldRate) * 100 : 0;

    return {
      startRate: oldRate,
      endRate: newRate,
      change: parseFloat(change.toFixed(2)),
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  /**
   * Update shop's quick access settings
   */
  async updateShopSettings(shop, metalRate) {
    try {
      shop.settings = shop.settings || {};
      shop.settings.metalRates = {
        gold: {
          rate24K: metalRate.gold.gold24K.sellingRate,
          rate22K: metalRate.gold.gold22K.sellingRate,
          rate18K: metalRate.gold.gold18K.sellingRate,
          lastUpdated: new Date(),
        },
        silver: {
          rate999: metalRate.silver.pure.sellingRate,
          rate925: metalRate.silver.sterling925.sellingRate,
          lastUpdated: new Date(),
        },
        platinum: {
          rate: metalRate.platinum.sellingRate,
          lastUpdated: new Date(),
        },
      };

      await shop.save({ validateBeforeSave: false });
    } catch (error) {
      // Don't throw error - this is not critical
      logger.error('Error updating shop settings:', error);
    }
  }

  /**
   * Invalidate all rate-related caches for a shop
   */
  async invalidateCaches(shopId) {
    try {
      await Promise.all([
        cache.del(`metal-rates:${shopId}:current`),
        cache.del(`metal-rates:${shopId}:history`),
        cache.del(`metal-rates:${shopId}:trends:gold:*`),
        cache.del(`metal-rates:${shopId}:trends:silver:*`),
        cache.del(`metal-rates:${shopId}:trends:platinum:*`),
        cache.del(`shop:${shopId}`),
      ]);
    } catch (error) {
      logger.error('Error invalidating caches:', error);
    }
  }
}

// Export singleton instance
export default new MetalRateService();
