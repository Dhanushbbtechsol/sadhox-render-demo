import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RefreshCookieOriginGuard } from "./refresh-cookie-origin.guard";
import { REFRESH_COOKIE_NAME } from "./refresh-cookie";

describe("AuthController cookie flags (Day 16)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RefreshCookieOriginGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === "NODE_ENV" ? "test" : undefined,
            getOrThrow: (key: string) => {
              if (key === "CORS_ORIGIN") return "http://localhost:5173";
              throw new Error(`missing ${key}`);
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: vi.fn().mockResolvedValue({
              accessToken: "access",
              refreshToken: "refresh-secret-value",
              user: {
                id: "u1",
                email: "admin@sadhox.local",
                name: "Admin",
                role: "Admin",
              },
            }),
            refresh: vi.fn().mockResolvedValue({
              accessToken: "access-rotated",
              refreshToken: "refresh-rotated",
            }),
            logout: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("login Set-Cookie is HttpOnly; SameSite=Lax in development", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@sadhox.local", password: "x" })
        .expect(200);

      const setCookie = res.headers["set-cookie"];
      const raw = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      expect(raw).toMatch(new RegExp(`^${REFRESH_COOKIE_NAME}=`));
      expect(raw.toLowerCase()).toContain("httponly");
      expect(raw.toLowerCase()).toMatch(/samesite=lax/);
      expect(raw.toLowerCase()).toContain("path=/auth");
      expect(raw.toLowerCase()).not.toContain("secure");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("refresh rejects a non-allowlisted Origin", async () => {
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Origin", "https://evil.example")
      .expect(403);
  });

  it("logout rejects a non-allowlisted Origin", async () => {
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Origin", "https://evil.example")
      .expect(403);
  });

  it("refresh allows missing Origin in test (Supertest)", async () => {
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=refresh-secret-value`)
      .expect(200);
  });
});

