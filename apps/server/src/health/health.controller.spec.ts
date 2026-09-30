import { describe, expect, it, vi } from "vitest";
import { THROTTLE_AUTH_LOGIN, THROTTLE_GLOBAL } from "../common/throttle.constants";
import { DrizzleHealthIndicator } from "./drizzle.health";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./redis.health";

describe("throttle constants", () => {
  it("global default is 100/min", () => {
    expect(THROTTLE_GLOBAL).toEqual({
      name: "default",
      ttl: 60_000,
      limit: 100,
    });
  });

  it("login throttle is 5/min", () => {
    expect(THROTTLE_AUTH_LOGIN.default).toEqual({
      limit: 5,
      ttl: 60_000,
    });
  });
});

describe("HealthController liveness", () => {
  it("GET /health and /health/live return minimal ok with no deps", () => {
    const controller = new HealthController(
      { check: vi.fn() } as never,
      { pingCheck: vi.fn() } as never,
      { pingCheck: vi.fn() } as never,
    );
    expect(controller.live()).toEqual({ status: "ok" });
    expect(controller.liveAlias()).toEqual({ status: "ok" });
  });

  it("ready delegates to Terminus HealthCheckService", async () => {
    const check = vi.fn().mockResolvedValue({ status: "ok", details: {} });
    const db = { pingCheck: vi.fn() };
    const redis = { pingCheck: vi.fn() };
    const controller = new HealthController(
      { check } as never,
      db as never,
      redis as never,
    );
    await controller.ready();
    expect(check).toHaveBeenCalledTimes(1);
    const indicators = check.mock.calls[0][0] as Array<() => unknown>;
    expect(indicators).toHaveLength(2);
  });
});

function mockIndicatorService() {
  return {
    check: (key: string) => ({
      attempt: (fn: () => Promise<unknown>) => {
        const run = async () => {
          try {
            await fn();
            return { [key]: { status: "up" as const } };
          } catch (err) {
            return {
              [key]: {
                status: "down" as const,
                message: err instanceof Error ? err.message : String(err),
              },
            };
          }
        };
        const attempt = {
          withTimeout() {
            return attempt;
          },
          then(
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) {
            return run().then(onFulfilled, onRejected);
          },
        };
        return attempt;
      },
    }),
  };
}

describe("DrizzleHealthIndicator", () => {
  it("reports up when select 1 succeeds", async () => {
    const db = { execute: vi.fn().mockResolvedValue(undefined) };
    const indicator = new DrizzleHealthIndicator(
      mockIndicatorService() as never,
      db as never,
    );
    await expect(indicator.pingCheck("database")).resolves.toEqual({
      database: { status: "up" },
    });
  });

  it("reports down when DB is unreachable", async () => {
    const db = {
      execute: vi.fn().mockRejectedValue(new Error("connection refused")),
    };
    const indicator = new DrizzleHealthIndicator(
      mockIndicatorService() as never,
      db as never,
    );
    await expect(indicator.pingCheck("database")).resolves.toEqual({
      database: { status: "down", message: "connection refused" },
    });
  });
});

describe("RedisHealthIndicator", () => {
  it("reports down when Redis is unreachable", async () => {
    const config = {
      getOrThrow: vi.fn().mockReturnValue("redis://127.0.0.1:1"),
    };
    const indicator = new RedisHealthIndicator(
      mockIndicatorService() as never,
      config as never,
    );
    const result = await indicator.pingCheck("redis");
    expect(result.redis.status).toBe("down");
  });
});
