/**
 * Centralized Authentication Configuration
 * Defines session lifespans, brute force lockout constants, and cookie settings.
 */
export const AUTH_CONFIG = {
  // Session parameters
  SESSION_EXPIRY_HOURS: 12,
  SESSION_RENEWAL_WINDOW_HOURS: 2, // Auto-extends session if accessed within 2 hours of expiry

  // Security brute force policies
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,

  // Cookie keys
  SESSION_COOKIE_NAME: "sgh_session_token",
  CSRF_COOKIE_NAME: "sgh_csrf_token",
  CSRF_HEADER_NAME: "x-csrf-token",

  // Cookie configurations
  COOKIE_SETTINGS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  },
};
