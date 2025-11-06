// ============================================================================
// FILE: middlewares/performanceMonitor.js
// ============================================================================

import logger from '../utils/logger.js';

/**
 * Performance Monitoring Middleware
 * Tracks request duration, memory usage, and slow endpoints
 */

// Store performance metrics
const metrics = {
  requests: [],
  slowRequests: [],
  endpoints: new Map(),
};

/**
 * Main performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture metrics
  res.end = function (...args) {
    // Calculate duration
    const hrDuration = process.hrtime(startTime);
    const durationMs = (hrDuration[0] * 1000 + hrDuration[1] / 1000000).toFixed(2);

    // Calculate memory usage
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2),
      rss: ((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2),
    };

    // Create metric object
    const metric = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: parseFloat(durationMs),
      memoryDelta: memoryDelta.heapUsed,
      timestamp: new Date().toISOString(),
      userId: req.user?._id || 'anonymous',
      organizationId: req.user?.organizationId || 'N/A',
      shopId: req.shopId || req.params.shopId || 'N/A',
    };

    // Store metric
    storeMetric(metric);

    // Log slow requests (> 1000ms)
    if (metric.duration > 1000) {
      logger.warn('Slow Request Detected', {
        ...metric,
        threshold: '1000ms',
      });
    }

    // Log high memory usage (> 50MB)
    if (Math.abs(parseFloat(memoryDelta.heapUsed)) > 50) {
      logger.warn('High Memory Usage', {
        ...metric,
        memoryThreshold: '50MB',
      });
    }

    // Log errors (5xx status codes)
    if (res.statusCode >= 500) {
      logger.error('Server Error in Request', metric);
    }

    // Restore original end function and call it
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Store metric in memory (keep last 1000 requests)
 */
function storeMetric(metric) {
  // Store in general requests array
  metrics.requests.push(metric);
  if (metrics.requests.length > 1000) {
    metrics.requests.shift();
  }

  // Store slow requests separately
  if (metric.duration > 1000) {
    metrics.slowRequests.push(metric);
    if (metrics.slowRequests.length > 100) {
      metrics.slowRequests.shift();
    }
  }

  // Track endpoint statistics
  const endpoint = `${metric.method} ${metric.url.split('?')[0]}`;
  if (!metrics.endpoints.has(endpoint)) {
    metrics.endpoints.set(endpoint, {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
    });
  }

  const endpointStats = metrics.endpoints.get(endpoint);
  endpointStats.count++;
  endpointStats.totalDuration += metric.duration;
  endpointStats.avgDuration = (endpointStats.totalDuration / endpointStats.count).toFixed(2);
  endpointStats.minDuration = Math.min(endpointStats.minDuration, metric.duration);
  endpointStats.maxDuration = Math.max(endpointStats.maxDuration, metric.duration);

  if (metric.statusCode >= 400) {
    endpointStats.errors++;
  }
}

/**
 * Get performance metrics
 */
export const getMetrics = () => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Filter requests from last hour
  const recentRequests = metrics.requests.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);

  // Calculate statistics
  const totalRequests = recentRequests.length;
  const avgDuration =
    totalRequests > 0
      ? (recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests).toFixed(2)
      : 0;

  const requestsPerMinute = totalRequests / 60;

  // Status code distribution
  const statusCodes = recentRequests.reduce((acc, r) => {
    const code = r.statusCode;
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  // Convert endpoint map to sorted array
  const endpointStats = Array.from(metrics.endpoints.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      ...stats,
      errorRate: ((stats.errors / stats.count) * 100).toFixed(2) + '%',
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    summary: {
      totalRequests,
      requestsPerMinute: requestsPerMinute.toFixed(2),
      avgDuration: parseFloat(avgDuration),
      slowRequests: metrics.slowRequests.length,
    },
    statusCodes,
    endpoints: endpointStats.slice(0, 20), // Top 20 endpoints
    slowRequests: metrics.slowRequests.slice(-10), // Last 10 slow requests
    memoryUsage: {
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
      external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB',
    },
    uptime: process.uptime().toFixed(2) + ' seconds',
  };
};

/**
 * Clear metrics
 */
export const clearMetrics = () => {
  metrics.requests = [];
  metrics.slowRequests = [];
  metrics.endpoints.clear();
  logger.info('Performance metrics cleared');
};

/**
 * Performance report endpoint controller
 * Use this in your routes: GET /api/v1/admin/performance
 */
export const getPerformanceReport = (req, res) => {
  try {
    const report = getMetrics();
    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message,
    });
  }
};

export default performanceMonitor;
