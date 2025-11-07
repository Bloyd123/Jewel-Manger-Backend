import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * MongoDB Database Connection Loader
 */
const connectDatabase = async () => {
  try {
    // MongoDB Connection Options
    const options = {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,

      // Retry settings
      retryWrites: true,
      w: 'majority',

      // Performance settings
      maxIdleTimeMS: 30000,
      compressors: ['zlib'],
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', err => {
      logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Enable Mongoose debug mode in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

// Mongoose global settings
mongoose.set('strictQuery', false);
mongoose.set('toJSON', { virtuals: true });
mongoose.set('toObject', { virtuals: true });

export default connectDatabase;
