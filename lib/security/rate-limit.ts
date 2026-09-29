/**
 * In-memory sliding window rate limiter for public form submissions.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number; // e.g. 60,000 ms (1 minute)
  maxRequests: number; // e.g. 10 requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTimeMs: number;
}

class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up stale rate limit entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
      // Unref timer if available so it does not block Node process exit
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(
    identifier: string,
    options: RateLimitOptions = { windowMs: 60_000, maxRequests: 10 }
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - options.windowMs;

    let record = this.store.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(identifier, record);
    }

    // Filter out timestamps outside the current sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= options.maxRequests) {
      const oldestInWindow = record.timestamps[0];
      const resetTimeMs = oldestInWindow + options.windowMs;
      return {
        allowed: false,
        remaining: 0,
        limit: options.maxRequests,
        resetTimeMs,
      };
    }

    // Record this request timestamp
    record.timestamps.push(now);

    return {
      allowed: true,
      remaining: options.maxRequests - record.timestamps.length,
      limit: options.maxRequests,
      resetTimeMs: now + options.windowMs,
    };
  }

  public cleanup(windowMs: number = 60_000): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      const validTimestamps = record.timestamps.filter((ts) => ts > now - windowMs);
      if (validTimestamps.length === 0) {
        this.store.delete(key);
      } else {
        record.timestamps = validTimestamps;
      }
    }
  }

  public reset(): void {
    this.store.clear();
  }
}

// Global singleton instance for runtime
export const submissionRateLimiter = new RateLimiter();
