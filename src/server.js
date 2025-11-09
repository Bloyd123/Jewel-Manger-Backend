import createApp from './app.js';
import logger from './utils/logger.js';
import {
  handleUncaughtException,
  handleUnhandledRejection,
  handleSIGTERM,
} from './api/middlewares/errorHandler.js';

// Load environment variables

// Handle uncaught exceptions (MUST be at the top)
handleUncaughtException();

// Server configuration
const PORT = process.env.PORT;
const HOST = process.env.HOST;
const NODE_ENV = process.env.NODE_ENV;

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Create Express app
    const app = await createApp();

    // Start listening
    const server = app.listen(PORT, HOST, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 Server started successfully!`);
      logger.info(`📍 Environment: ${NODE_ENV}`);
      logger.info(`🌐 Server running on: http://${HOST}:${PORT}`);
      logger.info(`🏥 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`📊 API endpoint: http://${HOST}:${PORT}/api`);
      logger.info('='.repeat(50));
    });

    // Handle unhandled promise rejections
    handleUnhandledRejection(server);

    // Handle SIGTERM
    handleSIGTERM(server);

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
