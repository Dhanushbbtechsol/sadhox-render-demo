import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { REFRESH_COOKIE_NAME } from "./refresh-cookie";

describe("AuthController cookie flags (Day 16)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
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
            refresh: vi.fn(),
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
});
