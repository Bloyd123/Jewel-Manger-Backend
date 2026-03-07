// FILE: middlewares/performanceMonitor.js

import logger from '../utils/logger.js';

const metrics = {
  requests: [],
  slowRequests: [],
  endpoints: new Map(),
};

const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();

  const originalEnd = res.end;

  res.end = function (...args) {
    const hrDuration = process.hrtime(startTime);
    const durationMs = (hrDuration[0] * 1000 + hrDuration[1] / 1000000).toFixed(2);

    const endMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2),
      rss: ((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2),
    };

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

    storeMetric(metric);

    if (metric.duration > 1000) {
      logger.warn('Slow Request Detected', {
        ...metric,
        threshold: '1000ms',
      });
    }

    if (Math.abs(parseFloat(memoryDelta.heapUsed)) > 50) {
      logger.warn('High Memory Usage', {
        ...metric,
        memoryThreshold: '50MB',
      });
    }

    if (res.statusCode >= 500) {
      logger.error('Server Error in Request', metric);
    }

    originalEnd.apply(res, args);
  };

  next();
};


function storeMetric(metric) {
  metrics.requests.push(metric);
  if (metrics.requests.length > 1000) {
    metrics.requests.shift();
  }

  if (metric.duration > 1000) {
    metrics.slowRequests.push(metric);
    if (metrics.slowRequests.length > 100) {
      metrics.slowRequests.shift();
    }
  }

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

export const getMetrics = () => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const recentRequests = metrics.requests.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);

  const totalRequests = recentRequests.length;
  const avgDuration =
    totalRequests > 0
      ? (recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests).toFixed(2)
      : 0;

  const requestsPerMinute = totalRequests / 60;

  const statusCodes = recentRequests.reduce((acc, r) => {
    const code = r.statusCode;
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

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
    endpoints: endpointStats.slice(0, 20), 
    slowRequests: metrics.slowRequests.slice(-10), 
    memoryUsage: {
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
      external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB',
    },
    uptime: process.uptime().toFixed(2) + ' seconds',
  };
};

export const clearMetrics = () => {
  metrics.requests = [];
  metrics.slowRequests = [];
  metrics.endpoints.clear();
  logger.info('Performance metrics cleared');
};

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
