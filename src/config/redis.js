// FILE: config/redis.js
// Redis Configuration and Connection

import { createClient } from 'redis';
import logger from '../utils/logger.js';

/**
 * Redis Configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: times => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

/**
 * Create Redis Client
 */
const createRedisClient = () => {
  // Build Redis URL
  let redisUrl = `redis://`;

  if (redisConfig.password) {
    redisUrl += `:${redisConfig.password}@`;
  }

  redisUrl += `${redisConfig.host}:${redisConfig.port}`;

  if (redisConfig.db) {
    redisUrl += `/${redisConfig.db}`;
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: redisConfig.connectTimeout,
      reconnectStrategy: redisConfig.retryStrategy,
    },
  });

  // Event listeners
  client.on('connect', () => {
    logger.info('Redis client connecting...');
  });

  client.on('ready', () => {
    logger.info('✓ Redis client connected and ready');
  });

  client.on('error', err => {
    logger.error('Redis client error:', err);
  });

  client.on('end', () => {
    logger.warn('Redis client connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  return client;
};

/**
 * Initialize Redis Connection
 */
const redis = createRedisClient();

/**
 * Connect to Redis
 */
export const connectRedis = async () => {
  try {
    await redis.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Don't throw error - app should work without Redis
    // Rate limiting will fall back to in-memory store
  }
};

/**
 * Disconnect from Redis
 */
export const disconnectRedis = async () => {
  try {
    if (redis.isOpen) {
      await redis.quit();
      logger.info('Redis connection closed gracefully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

/**
 * Check Redis connection status
 */
export const isRedisConnected = () => {
  return redis.isOpen && redis.isReady;
};

/**
 * Redis utility functions
 */
export const redisUtils = {
  /**
   * Set key with expiration
   */
  setEx: async (key, value, expirySeconds) => {
    try {
      if (!isRedisConnected()) return false;
      await redis.setEx(key, expirySeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis setEx error:', error);
      return false;
    }
  },

  /**
   * Get key value
   */
  get: async key => {
    try {
      if (!isRedisConnected()) return null;
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Delete key
   */
  del: async key => {
    try {
      if (!isRedisConnected()) return false;
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  exists: async key => {
    try {
      if (!isRedisConnected()) return false;
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  },

  /**
   * Set key expiration
   */
  expire: async (key, seconds) => {
    try {
      if (!isRedisConnected()) return false;
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  },

  /**
   * Get TTL (Time To Live) of key
   */
  ttl: async key => {
    try {
      if (!isRedisConnected()) return -1;
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Redis ttl error:', error);
      return -1;
    }
  },

  /**
   * Increment value
   */
  incr: async key => {
    try {
      if (!isRedisConnected()) return null;
      return await redis.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', error);
      return null;
    }
  },

  /**
   * Decrement value
   */
  decr: async key => {
    try {
      if (!isRedisConnected()) return null;
      return await redis.decr(key);
    } catch (error) {
      logger.error('Redis decr error:', error);
      return null;
    }
  },

  /**
   * Flush all data (use with caution!)
   */
  flushAll: async () => {
    try {
      if (!isRedisConnected()) return false;
      await redis.flushAll();
      logger.warn('Redis: All data flushed!');
      return true;
    } catch (error) {
      logger.error('Redis flushAll error:', error);
      return false;
    }
  },
};

// Default export
export default redis;
