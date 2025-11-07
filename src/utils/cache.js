import NodeCache from 'node-cache';
import logger from './logger.js';

/**
 * Cache Utility
 * In-memory caching for frequently accessed data
 */

class CacheManager {
  constructor() {
    // Initialize cache with default options
    this.cache = new NodeCache({
      stdTTL: 600, // Default TTL: 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: true, // Clone variables before returning
      deleteOnExpire: true,
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup cache event listeners
   */
  setupEventListeners() {
    this.cache.on('set', (key, _value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, _value) => {
      logger.debug(`Cache DELETE: ${key}`);
    });

    this.cache.on('expired', (key, _value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.info('Cache FLUSHED');
    });
  }

  /**
   * Get value from cache
   * @param {String} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    try {
      const value = this.cache.get(key);

      if (value !== undefined) {
        this.stats.hits++;
        logger.debug(`Cache HIT: ${key}`);
        return value;
      }

      this.stats.misses++;
      logger.debug(`Cache MISS: ${key}`);
      return undefined;
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param {String} key - Cache key
   * @param {*} value - Value to cache
   * @param {Number} ttl - Time to live in seconds (optional)
   * @returns {Boolean} Success status
   */
  set(key, value, ttl = null) {
    try {
      const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);

      if (success) {
        this.stats.sets++;
        logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
      }

      return success;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * @param {Array<String>} keys - Array of cache keys
   * @returns {Object} Object with key-value pairs
   */
  mget(keys) {
    try {
      return this.cache.mget(keys);
    } catch (error) {
      logger.error('Cache MGET error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs at once
   * @param {Array<Object>} items - Array of {key, value, ttl} objects
   * @returns {Boolean} Success status
   */
  mset(items) {
    try {
      const success = this.cache.mset(items);
      if (success) {
        this.stats.sets += items.length;
      }
      return success;
    } catch (error) {
      logger.error('Cache MSET error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {String} key - Cache key
   * @returns {Number} Number of deleted entries
   */
  del(key) {
    try {
      const count = this.cache.del(key);
      if (count > 0) {
        this.stats.deletes += count;
        logger.debug(`Cache DELETE: ${key}`);
      }
      return count;
    } catch (error) {
      logger.error(`Cache DELETE error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Delete multiple keys
   * @param {Array<String>} keys - Array of cache keys
   * @returns {Number} Number of deleted entries
   */
  mdel(keys) {
    try {
      const count = this.cache.del(keys);
      this.stats.deletes += count;
      return count;
    } catch (error) {
      logger.error('Cache MDEL error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {String} key - Cache key
   * @returns {Boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get TTL for a key
   * @param {String} key - Cache key
   * @returns {Number|undefined} TTL in seconds or undefined
   */
  getTtl(key) {
    return this.cache.getTtl(key);
  }

  /**
   * Update TTL for a key
   * @param {String} key - Cache key
   * @param {Number} ttl - New TTL in seconds
   * @returns {Boolean} Success status
   */
  ttl(key, ttl) {
    try {
      return this.cache.ttl(key, ttl);
    } catch (error) {
      logger.error(`Cache TTL update error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all cache keys
   * @returns {Array<String>} Array of cache keys
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * Flush all cache
   */
  flush() {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: cacheStats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Close cache
   */
  close() {
    this.cache.close();
    logger.info('Cache closed');
  }

  // ==================== Helper Methods ====================

  /**
   * Generate cache key for user
   */
  userKey(userId) {
    return `user:${userId}`;
  }

  /**
   * Generate cache key for organization
   */
  orgKey(orgId) {
    return `org:${orgId}`;
  }

  /**
   * Generate cache key for shop
   */
  shopKey(shopId) {
    return `shop:${shopId}`;
  }

  /**
   * Generate cache key for product
   */
  productKey(productId) {
    return `product:${productId}`;
  }

  /**
   * Generate cache key for metal rates
   */
  metalRatesKey(shopId) {
    return `metal_rates:${shopId}`;
  }

  /**
   * Generate cache key for user permissions
   */
  permissionsKey(userId, shopId) {
    return `permissions:${userId}:${shopId}`;
  }

  /**
   * Generate cache key for shop settings
   */
  settingsKey(shopId) {
    return `settings:${shopId}`;
  }

  /**
   * Delete all keys matching pattern
   * @param {String} pattern - Pattern to match (e.g., 'user:*')
   * @returns {Number} Number of deleted keys
   */
  deletePattern(pattern) {
    try {
      const keys = this.cache.keys();
      const regex = new RegExp(pattern.replace('*', '.*'));
      const matchingKeys = keys.filter(key => regex.test(key));

      if (matchingKeys.length > 0) {
        return this.mdel(matchingKeys);
      }

      return 0;
    } catch (error) {
      logger.error('Cache DELETE PATTERN error:', error);
      return 0;
    }
  }

  /**
   * Cache wrapper function - get from cache or execute function
   * @param {String} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {Number} ttl - TTL in seconds
   * @returns {Promise<*>} Cached or fresh value
   */
  async remember(key, fn, ttl = null) {
    try {
      // Try to get from cache
      let value = this.get(key);

      if (value !== undefined) {
        return value;
      }

      // Cache miss - execute function
      value = await fn();

      // Store in cache
      if (value !== undefined && value !== null) {
        this.set(key, value, ttl);
      }

      return value;
    } catch (error) {
      logger.error(`Cache REMEMBER error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for organization (delete all org-related keys)
   */
  invalidateOrg(orgId) {
    return this.deletePattern(`org:${orgId}*`);
  }

  /**
   * Invalidate cache for shop (delete all shop-related keys)
   */
  invalidateShop(shopId) {
    return this.deletePattern(`shop:${shopId}*`);
  }

  /**
   * Invalidate cache for user (delete all user-related keys)
   */
  invalidateUser(userId) {
    return this.deletePattern(`user:${userId}*`);
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmup(data) {
    try {
      const items = [];

      for (const [key, value] of Object.entries(data)) {
        items.push({ key, val: value });
      }

      this.mset(items);
      logger.info(`Cache warmed up with ${items.length} items`);
    } catch (error) {
      logger.error('Cache WARMUP error:', error);
    }
  }
}

// Export singleton instance
export default new CacheManager();
