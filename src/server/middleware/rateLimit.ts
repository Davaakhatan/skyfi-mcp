import rateLimit from 'express-rate-limit';
import { config } from '@config/index';
import { RateLimitError } from '@utils/errors';

/**
 * Create rate limiter middleware
 */
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || config.rateLimit.windowMs,
    max: options?.max || config.rateLimit.maxRequests,
    message: options?.message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw new RateLimitError('Rate limit exceeded');
    },
  });
};

/**
 * Default rate limiter for all routes
 */
export const defaultRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Lenient rate limiter for read-only endpoints
 */
export const readRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests * 2, // Double for read operations
});

