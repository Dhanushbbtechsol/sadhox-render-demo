import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { RefreshCookieOriginGuard } from "./refresh-cookie-origin.guard";

function makeGuard(env: {
  NODE_ENV?: string;
  CORS_ORIGIN: string;
}): RefreshCookieOriginGuard {
  const config = {
    get: (key: string) => (key === "NODE_ENV" ? env.NODE_ENV : undefined),
    getOrThrow: (key: string) => {
      if (key === "CORS_ORIGIN") return env.CORS_ORIGIN;
      throw new Error(`missing ${key}`);
    },
  } as unknown as ConfigService;
  return new RefreshCookieOriginGuard(config);
}

function ctx(origin?: string | string[]) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: origin === undefined ? {} : { origin },
      }),
    }),
  } as never;
}

describe("RefreshCookieOriginGuard", () => {
  const allowed = "http://localhost:5173";

  it("allows matching Origin in any env", () => {
    const guard = makeGuard({
      NODE_ENV: "production",
      CORS_ORIGIN: allowed,
    });
    expect(guard.canActivate(ctx(allowed))).toBe(true);
  });

  it("rejects wrong Origin in development", () => {
    const guard = makeGuard({
      NODE_ENV: "development",
      CORS_ORIGIN: allowed,
    });
    expect(() => guard.canActivate(ctx("https://evil.example"))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects wrong Origin in production", () => {
    const guard = makeGuard({
      NODE_ENV: "production",
      CORS_ORIGIN: allowed,
    });
    expect(() => guard.canActivate(ctx("https://evil.example"))).toThrow(
      /Origin not allowed/,
    );
  });

  it("rejects missing Origin in production", () => {
    const guard = makeGuard({
      NODE_ENV: "production",
      CORS_ORIGIN: allowed,
    });
    expect(() => guard.canActivate(ctx())).toThrow(/Missing Origin/);
  });

  it("allows missing Origin in development (curl / local tools)", () => {
    const guard = makeGuard({
      NODE_ENV: "development",
      CORS_ORIGIN: allowed,
    });
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it("allows missing Origin in test (Supertest)", () => {
    const guard = makeGuard({
      NODE_ENV: "test",
      CORS_ORIGIN: allowed,
    });
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it("accepts Origin from comma-separated CORS_ORIGIN allowlist", () => {
    const guard = makeGuard({
      NODE_ENV: "production",
      CORS_ORIGIN: `${allowed}, https://sadhox.vercel.app`,
    });
    expect(guard.canActivate(ctx("https://sadhox.vercel.app"))).toBe(true);
  });
});
