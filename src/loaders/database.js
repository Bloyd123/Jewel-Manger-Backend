import mongoose from 'mongoose';
import logger from '../utils/logger.js';
const connectDatabase = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,

      retryWrites: true,
      w: 'majority',

      maxIdleTimeMS: 30000,
      compressors: ['zlib'],
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);

    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', err => {
      logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('  MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

mongoose.set('strictQuery', false);
mongoose.set('toJSON', { virtuals: true });
mongoose.set('toObject', { virtuals: true });

export default connectDatabase;
