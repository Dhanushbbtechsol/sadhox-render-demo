import {
  UnauthorizedException,
  type INestApplication,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { HealthCheckService } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import cookieParser = require("cookie-parser");
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthController } from "../auth/auth.controller";
import { AuthService } from "../auth/auth.service";
import { REFRESH_COOKIE_NAME } from "../auth/refresh-cookie";
import { RefreshCookieOriginGuard } from "../auth/refresh-cookie-origin.guard";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { DRIZZLE } from "../database/database.constants";
import { DrizzleHealthIndicator } from "../health/drizzle.health";
import { HealthController } from "../health/health.controller";
import { RedisHealthIndicator } from "../health/redis.health";
import { SentryExceptionFilter } from "../observability/sentry-exception.filter";
import {
  DATABASE_UNAVAILABLE_BODY,
  DATABASE_UNAVAILABLE_RETRY_AFTER,
  DatabaseUnavailableException,
  isDatabaseUnavailableError,
  throwIfDatabaseUnavailable,
} from "./database-unavailable";
import { DatabaseUnavailableProbeController } from "./database-unavailable.probe";
import { HttpThrottlerGuard } from "./guards/http-throttler.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PostgresThrottlerStorage } from "./postgres-throttler.storage";

function errWithCode(code: string, message = "boom"): Error {
  return Object.assign(new Error(message), { code });
}

function wrapCause(outerMessage: string, cause: Error): Error {
  return Object.assign(new Error(outerMessage), { cause });
}

const UNAVAILABLE_CODES = [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "CONNECT_TIMEOUT",
  "08006",
  "08003",
  "57P01",
  "53300",
] as const;

describe("isDatabaseUnavailableError", () => {
  it.each([...UNAVAILABLE_CODES])("detects code %s", (code) => {
    expect(isDatabaseUnavailableError(errWithCode(code))).toBe(true);
  });

  it("unwraps Drizzle-style cause chain", () => {
    const driver = errWithCode(
      "ECONNREFUSED",
      "connect ECONNREFUSED 127.0.0.1:5432",
    );
    const drizzle = wrapCause("Failed query: select ...", driver);
    expect(isDatabaseUnavailableError(drizzle)).toBe(true);
  });

  it("detects DatabaseUnavailableException marker", () => {
    expect(
      isDatabaseUnavailableError(new DatabaseUnavailableException()),
    ).toBe(true);
  });

  it("does not treat wrong-password style errors as unavailable", () => {
    expect(isDatabaseUnavailableError(new Error("Invalid credentials"))).toBe(
      false,
    );
    expect(isDatabaseUnavailableError(errWithCode("28P01"))).toBe(false);
  });

  it("does not treat generic bugs as unavailable", () => {
    expect(
      isDatabaseUnavailableError(new TypeError("x is not a function")),
    ).toBe(false);
    expect(isDatabaseUnavailableError(errWithCode("42P01"))).toBe(false);
  });

  it("throwIfDatabaseUnavailable maps then rethrows others", () => {
    expect(() =>
      throwIfDatabaseUnavailable(errWithCode("ECONNREFUSED")),
    ).toThrow(DatabaseUnavailableException);
    expect(() => throwIfDatabaseUnavailable(new Error("bug"))).toThrow("bug");
  });
});

describe("database unavailable HTTP mapping", () => {
  let app: INestApplication;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let dbSelectLimit: ReturnType<typeof vi.fn>;
  let throttleIncrement: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    authService = {
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    dbSelectLimit = vi.fn();
    throttleIncrement = vi.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: dbSelectLimit,
          })),
        })),
      })),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: "jwt" }),
        ThrottlerModule.forRoot({
          throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
          storage: {
            increment: (...args: unknown[]) => throttleIncrement(...args),
          },
        }),
      ],
      controllers: [
        AuthController,
        HealthController,
        DatabaseUnavailableProbeController,
      ],
      providers: [
        RefreshCookieOriginGuard,
        JwtStrategy,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === "NODE_ENV" ? "test" : undefined),
            getOrThrow: (key: string) => {
              if (key === "CORS_ORIGIN") return "http://localhost:5173";
              if (key === "JWT_ACCESS_SECRET")
                return "test-access-secret-16chars";
              throw new Error(`missing ${key}`);
            },
          },
        },
        { provide: DRIZZLE, useValue: db },
        { provide: DrizzleHealthIndicator, useValue: { pingCheck: vi.fn() } },
        { provide: RedisHealthIndicator, useValue: { pingCheck: vi.fn() } },
        { provide: HealthCheckService, useValue: { check: vi.fn() } },
        { provide: APP_FILTER, useClass: SentryExceptionFilter },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: HttpThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function expectGeneric503(res: request.Response) {
    expect(res.status).toBe(503);
    expect(res.body).toEqual(DATABASE_UNAVAILABLE_BODY);
    expect(res.headers["retry-after"]).toBe(DATABASE_UNAVAILABLE_RETRY_AFTER);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|stack|SELECT/i);
  }

  it.each([...UNAVAILABLE_CODES])(
    "login returns 503 with no Set-Cookie for %s",
    async (code) => {
      authService.login.mockRejectedValueOnce(errWithCode(code));
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@sadhox.local", password: "x" });
      expectGeneric503(res);
      expect(res.headers["set-cookie"]).toBeUndefined();
      expect(res.body).not.toHaveProperty("accessToken");
    },
  );

  it("login returns 503 when Drizzle wraps ECONNREFUSED", async () => {
    authService.login.mockRejectedValueOnce(
      wrapCause("Failed query", errWithCode("ECONNREFUSED")),
    );
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@sadhox.local", password: "x" });
    expectGeneric503(res);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("refresh returns 503 and does not clear cookie", async () => {
    authService.refresh.mockRejectedValueOnce(errWithCode("ETIMEDOUT"));
    const res = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=still-here-token`);
    expectGeneric503(res);
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const raw = Array.isArray(setCookie)
        ? setCookie.join(";")
        : String(setCookie);
      expect(raw.toLowerCase()).not.toMatch(
        /max-age=0|expires=thu, 01 jan 1970/i,
      );
      expect(raw).not.toMatch(new RegExp(`${REFRESH_COOKIE_NAME}=;`));
    }
  });

  it("protected route returns 503 when JWT DB lookup fails", async () => {
    const jwt = new JwtService({
      secret: "test-access-secret-16chars",
    });
    const token = jwt.sign({
      sub: "11111111-1111-1111-1111-111111111111",
      email: "admin@sadhox.local",
      role: "Admin",
    });
    dbSelectLimit.mockRejectedValueOnce(errWithCode("CONNECTION_CLOSED"));
    const res = await request(app.getHttpServer())
      .get("/probe/protected")
      .set("Authorization", `Bearer ${token}`);
    expectGeneric503(res);
  });

  it("throttler storage failure maps to 503", async () => {
    throttleIncrement.mockRejectedValueOnce(errWithCode("ECONNREFUSED"));
    const res = await request(app.getHttpServer()).get("/probe/throttled");
    expectGeneric503(res);
  });

  it("wrong password with DB up stays 401", async () => {
    authService.login.mockRejectedValueOnce(
      new UnauthorizedException("Invalid credentials"),
    );
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@sadhox.local", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("real bugs stay 500", async () => {
    authService.login.mockRejectedValueOnce(new TypeError("bug"));
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@sadhox.local", password: "x" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      statusCode: 500,
      message: "Internal server error",
    });
  });

  it("/health and /health/live skip the throttler", async () => {
    throttleIncrement.mockClear();
    throttleIncrement.mockRejectedValue(errWithCode("ECONNREFUSED"));
    await request(app.getHttpServer()).get("/health").expect(200);
    await request(app.getHttpServer()).get("/health/live").expect(200);
    expect(throttleIncrement).not.toHaveBeenCalled();
  });
});

describe("PostgresThrottlerStorage mapping", () => {
  it("maps driver ECONNREFUSED through throwIfDatabaseUnavailable", async () => {
    const sql = Object.assign(
      vi.fn().mockRejectedValue(errWithCode("ECONNREFUSED")),
      { unsafe: vi.fn().mockResolvedValue(undefined) },
    );
    const storage = new PostgresThrottlerStorage(sql as never);
    await expect(
      storage.increment("k", 60_000, 10, 0, "default"),
    ).rejects.toBeInstanceOf(DatabaseUnavailableException);
  });
});
