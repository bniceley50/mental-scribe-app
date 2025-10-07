/**
 * Frontend Rate Limiter
 * Prevents abuse by limiting client-side request frequency
 * Works alongside backend rate limiting for defense in depth
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   * @param key - Unique identifier for the rate limit (e.g., 'chat-submit', 'file-upload')
   * @param config - Rate limit configuration
   * @returns true if allowed, false if rate limited
   */
  checkLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      // No entry or window expired - allow and create new window
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);
    return true;
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  getTimeUntilReset(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    
    const now = Date.now();
    return Math.max(0, entry.resetTime - now);
  }

  /**
   * Clear rate limit for a specific key
   */
  clear(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Default rate limit configurations
export const RATE_LIMITS = {
  CHAT_SUBMIT: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  FILE_UPLOAD: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  ANALYSIS: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  EXPORT: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  API_CALL: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
} as const;

// Singleton instance
export const rateLimiter = new RateLimiter();

// Helper function for easy usage
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig = RATE_LIMITS.API_CALL
): { allowed: boolean; retryAfter?: number } => {
  const allowed = rateLimiter.checkLimit(key, config);
  
  if (!allowed) {
    const retryAfter = Math.ceil(rateLimiter.getTimeUntilReset(key) / 1000);
    return { allowed: false, retryAfter };
  }
  
  return { allowed: true };
};
