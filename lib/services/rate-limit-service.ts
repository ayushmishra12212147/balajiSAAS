/**
 * Rate Limit Result Payload
 */
export interface RateLimitResult {
  success: boolean;  // True if request is allowed, false if throttled
  limit: number;     // Maximum requests in the window
  remaining: number; // Remaining allowed requests in this window
  reset: number;     // Epoch timestamp in milliseconds when window resets
}

/**
 * RateLimiter Provider interface.
 * Can be implemented by in-memory, Redis, or Memcached providers.
 */
export interface RateLimiter {
  isLimitExceeded(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

/**
 * InMemoryRateLimiter
 * Pure JavaScript sliding-window rate limiter.
 * Houses maps in memory, with automated cleanup checks to prevent heap leaks.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, number[]>();

  async isLimitExceeded(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const timestamps = this.store.get(key) || [];

    // Filter out timestamps outside the active window
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    // Eviction check to mitigate memory bloat
    if (this.store.size > 10000) {
      for (const [k, v] of this.store.entries()) {
        const filtered = v.filter((t) => now - t < windowMs);
        if (filtered.length === 0) {
          this.store.delete(k);
        } else {
          this.store.set(k, filtered);
        }
      }
    }

    if (validTimestamps.length >= limit) {
      const oldest = validTimestamps[0];
      const resetTime = oldest + windowMs;
      this.store.set(key, validTimestamps);
      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    validTimestamps.push(now);
    this.store.set(key, validTimestamps);
    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      reset: now + windowMs,
    };
  }
}

/**
 * RateLimitService
 * Reusable coordinator mapping active rate limiting requests to provider.
 */
export class RateLimitService {
  private static provider: RateLimiter = new InMemoryRateLimiter();

  /**
   * Set custom provider (e.g. Redis provider) at startup.
   */
  static setProvider(customProvider: RateLimiter) {
    this.provider = customProvider;
  }

  /**
   * Evaluates request limits against target key.
   */
  static async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    return this.provider.isLimitExceeded(key, limit, windowMs);
  }
}
