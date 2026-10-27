import mongoose from 'mongoose';
import { workerEnv } from '../../config/env.js';
import { logger } from '../logging/logger.js';

let cachedConnection = null;

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  try {
    cachedConnection = await mongoose.connect(workerEnv.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    logger.info('Worker connected to MongoDB');
    return cachedConnection;
  } catch (err) {
    logger.error('Worker MongoDB connection failed', { error: err.message });
    throw err;
  }
}
