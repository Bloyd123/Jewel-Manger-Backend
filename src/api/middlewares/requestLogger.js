import morgan from 'morgan';
import logger from '../utils/logger.js';

// Create a stream object with a 'write' function that will be used by morgan
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging in test environment
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'test';
};

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user ? req.user._id || req.user.id : 'anonymous';
});

// Custom token for organization ID
morgan.token('org-id', (req) => {
  return req.user?.organizationId || 'N/A';
});

// Custom token for shop ID
morgan.token('shop-id', (req) => {
  return req.shopId || req.params.shopId || 'N/A';
});

// Custom token for response time in ms with color
morgan.token('response-time-colored', (req, res) => {
  const responseTime = parseFloat(morgan['response-time'](req, res));
  if (responseTime < 100) return `\x1b[32m${responseTime}ms\x1b[0m`; // Green
  if (responseTime < 500) return `\x1b[33m${responseTime}ms\x1b[0m`; // Yellow
  return `\x1b[31m${responseTime}ms\x1b[0m`; // Red
});

// Define format for morgan
const format = ':method :url :status :response-time-colored - :user-id - :org-id - :shop-id';

// Build the morgan middleware
const requestLogger = morgan(format, { stream, skip });

export default requestLogger;
