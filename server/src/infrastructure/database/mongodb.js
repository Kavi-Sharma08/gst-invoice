import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

let cachedConnection = null;

/**
 * Connects to MongoDB with connection pooling and caching.
 * Reuses connection across serverless invocations and standalone server lifecycle.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const opts = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    };

    logger.info('Connecting to MongoDB...', { uri: env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') });
    cachedConnection = await mongoose.connect(env.MONGODB_URI, opts);
    logger.info('MongoDB connected successfully');
    return cachedConnection;
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    throw err;
  }
}

/**
 * Checks if the database is ready and connected.
 * @returns {boolean}
 */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Gracefully closes the database connection.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cachedConnection = null;
    logger.info('MongoDB disconnected');
  }
}
