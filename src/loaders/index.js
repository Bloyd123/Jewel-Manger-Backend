import connectDatabase from './database.js';
import loadExpressApp from './express.js';
import logger from '../utils/logger.js';

/**
 * Initialize All Loaders
 */
const initLoaders = async app => {
  logger.info('🔄 Initializing loaders...');

  try {
    // 1. Load Database Connection
    await connectDatabase();

    // 2. Load Express Configuration
    loadExpressApp(app);

    // 3. Load Redis (if you want to use it)
    // await connectRedis();

    logger.info('✅ All loaders initialized successfully');
  } catch (error) {
    logger.error('❌ Loader initialization failed:', error);
    throw error;
  }
};

export default initLoaders;
