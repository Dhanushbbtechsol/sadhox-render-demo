import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  resolveThrottleGlobal,
  THROTTLE_AUTH_LOGIN,
  THROTTLE_GLOBAL,
} from "./throttle.constants";

/**
 * Lightweight 429 simulation for login throttle limits.
 * Mirrors Nest ThrottlerGuard behavior at the route boundary (count per key).
 */
function createFixedWindowLimiter(limit: number, ttlMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key: string, now = Date.now()): { allowed: boolean; status: number } {
      const row = hits.get(key);
      if (!row || now >= row.resetAt) {
        hits.set(key, { count: 1, resetAt: now + ttlMs });
        return { allowed: true, status: 200 };
      }
      row.count += 1;
      if (row.count > limit) {
        return { allowed: false, status: 429 };
      }
      return { allowed: true, status: 200 };
    },
  };
}

describe("resolveThrottleGlobal", () => {
  it("keeps defaults when overrides omitted", () => {
    expect(resolveThrottleGlobal()).toEqual(THROTTLE_GLOBAL);
  });

  it("applies load-test overrides", () => {
    expect(resolveThrottleGlobal({ limit: 20000, ttl: 60_000 })).toEqual({
      name: "default",
      ttl: 60_000,
      limit: 20000,
    });
  });
});

describe("login throttle 429 behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects over-limit requests with 429 within the same minute", () => {
    const { limit, ttl } = THROTTLE_AUTH_LOGIN.default;
    const limiter = createFixedWindowLimiter(limit, ttl);
    const ip = "10.0.0.9";
    const results = Array.from({ length: limit + 2 }, () => limiter.hit(ip));
    expect(results.slice(0, limit).every((r) => r.status === 200)).toBe(true);
    expect(results[limit]?.status).toBe(429);
    expect(results[limit + 1]?.status).toBe(429);
  });

  it("allows traffic again after the TTL window", () => {
    const { limit, ttl } = THROTTLE_AUTH_LOGIN.default;
    const limiter = createFixedWindowLimiter(limit, ttl);
    const ip = "10.0.0.8";
    for (let i = 0; i < limit; i++) {
      expect(limiter.hit(ip).status).toBe(200);
    }
    expect(limiter.hit(ip).status).toBe(429);
    vi.advanceTimersByTime(ttl);
    expect(limiter.hit(ip).status).toBe(200);
  });
});
