import { AppError } from '../shared/errors/app-error.js';

const requestCounts = new Map();

/**
 * Lightweight in-memory sliding window rate limiter.
 * @param {number} maxRequests - Max requests allowed within window
 * @param {number} windowMs - Window duration in milliseconds
 */
export function rateLimit(maxRequests = 100, windowMs = 60000) {
  // Periodically clean up stale records
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
      if (now - record.startTime > windowMs) {
        requestCounts.delete(key);
      }
    }
  }, windowMs).unref?.();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const record = requestCounts.get(key) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count += 1;
    }

    requestCounts.set(key, record);

    if (record.count > maxRequests) {
      return next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
}
