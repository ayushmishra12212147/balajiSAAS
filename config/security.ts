/**
 * Centralized Security Configuration
 * Manages Content Security Policy, rate limit parameters, and allowed CORS origins.
 */
export const SECURITY_CONFIG = {
  // CORS policies
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],

  // Rate limiting strategies (token bucket configurations)
  RATE_LIMITING: {
    // General IP-based rate limiting
    GLOBAL: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    // Login endpoint throttling
    LOGIN: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
    },
    // Sensitive actions (e.g., Change Password)
    SENSITIVE: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    },
  },

  // Content Security Policy (CSP) directives
  CSP_DIRECTIVES: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
  },
};
