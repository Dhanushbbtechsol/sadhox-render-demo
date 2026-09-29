import { createHash } from "crypto";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import type { User } from "../database/schema";

type Row = Record<string, unknown>;

function createDbMock(selectRows: Row[][] = []) {
  const queue = [...selectRows];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const whereSelect = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: whereSelect, limit }));
  const select = vi.fn(() => ({ from }));

  const values = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values }));

  const whereUpdate = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, insert, update },
    spies: { select, insert, values, update, set, whereUpdate },
  };
}

describe("AuthService", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const email = "admin@sadhox.local";
  let passwordHash: string;
  let user: User;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("ValidPass1!", 4);
    user = {
      id: userId,
      email,
      passwordHash,
      role: "Admin",
      name: "Ian Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
  });

  function buildService(selectRows: Row[][] = []) {
    const { db, spies } = createDbMock(selectRows);
    const jwt = { sign: vi.fn().mockReturnValue("access.jwt") };
    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === "JWT_ACCESS_SECRET") return "test-access-secret-16";
        throw new Error(`missing ${key}`);
      }),
    };
    const service = new AuthService(
      db as never,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
    return { service, spies, jwt };
  }

  it("login succeeds with valid credentials", async () => {
    const { service, spies, jwt } = buildService([[user]]);

    const result = await service.login(email, "ValidPass1!", "127.0.0.1");

    expect(result.accessToken).toBe("access.jwt");
    expect(result.refreshToken).toHaveLength(96);
    expect(result.user).toEqual({
      id: userId,
      email,
      name: "Ian Admin",
      role: "Admin",
    });
    expect(jwt.sign).toHaveBeenCalled();
    expect(spies.insert).toHaveBeenCalled();
    expect(spies.values).toHaveBeenCalled();
  });

  it("login fails with wrong password (generic error, no enumeration)", async () => {
    const { service } = buildService([[user]]);

    await expect(service.login(email, "WrongPass1!", "10.0.0.1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.login(email, "WrongPass1!")).rejects.toThrow("Invalid credentials");
  });

  it("login fails for unknown user with the same generic error", async () => {
    const { service } = buildService([[]]);
    await expect(service.login("nobody@sadhox.local", "ValidPass1!")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("refresh rotates: old token revoked and a new one issued", async () => {
    const raw = "a".repeat(96);
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const stored = {
      id: "22222222-2222-2222-2222-222222222222",
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revoked: false,
      createdAt: new Date(),
    };
    const { service, spies } = buildService([[stored], [user]]);

    const result = await service.refresh(raw);

    expect(result.accessToken).toBe("access.jwt");
    expect(result.refreshToken).toHaveLength(96);
    expect(result.refreshToken).not.toEqual(raw);
    expect(spies.update).toHaveBeenCalled();
    expect(spies.set).toHaveBeenCalledWith({ revoked: true });
    expect(spies.insert).toHaveBeenCalled();
  });

  it("refresh with revoked or expired token is rejected", async () => {
    const raw = "b".repeat(96);
    const tokenHash = createHash("sha256").update(raw).digest("hex");

    const revoked = {
      id: "33333333-3333-3333-3333-333333333333",
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revoked: true,
      createdAt: new Date(),
    };
    const { service: s1 } = buildService([[revoked]]);
    await expect(s1.refresh(raw)).rejects.toThrow("Invalid refresh token");

    const expired = {
      ...revoked,
      revoked: false,
      expiresAt: new Date(Date.now() - 1000),
    };
    const { service: s2 } = buildService([[expired]]);
    await expect(s2.refresh(raw)).rejects.toThrow("Invalid refresh token");
  });

  it("logout revokes the refresh token", async () => {
    const raw = "c".repeat(96);
    const { service, spies } = buildService();
    await service.logout(raw);
    expect(spies.update).toHaveBeenCalled();
    expect(spies.set).toHaveBeenCalledWith({ revoked: true });
    expect(spies.whereUpdate).toHaveBeenCalled();
  });
});
