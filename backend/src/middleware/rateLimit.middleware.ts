import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Login Endpoint
 * Prevents brute force attacks on authentication
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count successful requests
});

/**
 * Rate Limiter for Refresh Token Endpoint
 * Prevents token farming attacks
 * 10 attempts per 15 minutes per IP
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: {
    error: 'Too Many Requests',
    message: 'Too many token refresh attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API Rate Limiter
 * Prevents DOS attacks on all API endpoints
 * 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health' || req.path === '/api/v1/health';
  },
});

/**
 * Strict Rate Limiter for Sensitive Operations
 * For operations like password change, admin actions
 * 10 requests per hour per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests for this operation, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
