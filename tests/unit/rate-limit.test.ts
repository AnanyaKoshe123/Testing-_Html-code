import { describe, it, expect, beforeEach } from "vitest";
import { submissionRateLimiter } from "@/lib/security/rate-limit";

describe("Rate Limiter Unit Tests", () => {
  beforeEach(() => {
    submissionRateLimiter.reset();
  });

  it("should allow requests within the specified limit", () => {
    const ip = "192.168.1.10";
    for (let i = 1; i <= 5; i++) {
      const result = submissionRateLimiter.check(ip, {
        windowMs: 60_000,
        maxRequests: 5,
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i);
    }
  });

  it("should block requests that exceed the limit", () => {
    const ip = "192.168.1.20";
    const opts = { windowMs: 60_000, maxRequests: 3 };

    // Consume 3 requests
    submissionRateLimiter.check(ip, opts);
    submissionRateLimiter.check(ip, opts);
    submissionRateLimiter.check(ip, opts);

    // 4th request should be blocked
    const blockedResult = submissionRateLimiter.check(ip, opts);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.remaining).toBe(0);
    expect(blockedResult.resetTimeMs).toBeGreaterThan(Date.now());
  });

  it("should track different identifiers independently", () => {
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";
    const opts = { windowMs: 60_000, maxRequests: 2 };

    submissionRateLimiter.check(ipA, opts);
    submissionRateLimiter.check(ipA, opts);
    const blockedA = submissionRateLimiter.check(ipA, opts);
    expect(blockedA.allowed).toBe(false);

    // ipB should still be permitted
    const allowedB = submissionRateLimiter.check(ipB, opts);
    expect(allowedB.allowed).toBe(true);
    expect(allowedB.remaining).toBe(1);
  });
});
