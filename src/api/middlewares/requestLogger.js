import morgan from 'morgan';
import logger from '../../utils/logger.js';

const stream = {
  write: message => logger.http(message.trim()),
};

const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'test';
};

morgan.token('user-id', req => {
  return req.user ? req.user._id || req.user.id : 'anonymous';
});

morgan.token('org-id', req => {
  return req.user?.organizationId || 'N/A';
});

morgan.token('shop-id', req => {
  return req.shopId || req.params.shopId || 'N/A';
});

morgan.token('response-time-colored', (req, res) => {
  const responseTime = parseFloat(morgan['response-time'](req, res));
  if (responseTime < 100) return `\x1b[32m${responseTime}ms\x1b[0m`; 
  if (responseTime < 500) return `\x1b[33m${responseTime}ms\x1b[0m`; 
  return `\x1b[31m${responseTime}ms\x1b[0m`; 
});

const format = ':method :url :status :response-time-colored - :user-id - :org-id - :shop-id';

const requestLogger = morgan(format, { stream, skip });

export default requestLogger;
