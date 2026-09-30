import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { of, throwError, lastValueFrom } from "rxjs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import {
  AUDIT_DIFF_MAX_BYTES,
  capAuditDiff,
  redactAuditValue,
} from "./redact-audit";

describe("redactAuditValue", () => {
  it("redacts password, token, refreshToken, authorization, cookie, and *secret*", () => {
    const input = {
      email: "a@b.com",
      password: "secret-pass",
      token: "abc",
      refreshToken: "def",
      authorization: "Bearer x",
      cookie: "sid=1",
      apiSecret: "hidden",
      nested: { clientSecret: "y", ok: true },
    };
    const out = redactAuditValue(input) as Record<string, unknown>;
    expect(out.email).toBe("a@b.com");
    expect(out.password).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.refreshToken).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.cookie).toBe("[REDACTED]");
    expect(out.apiSecret).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).clientSecret).toBe(
      "[REDACTED]",
    );
    expect((out.nested as Record<string, unknown>).ok).toBe(true);
  });

  it("redacts nested objects and arrays", () => {
    const input = {
      user: { password: "x", name: "Ada" },
      items: [{ token: "y" }, { id: 1 }],
    };
    const out = redactAuditValue(input) as {
      user: Record<string, unknown>;
      items: Record<string, unknown>[];
    };
    expect(out.user.password).toBe("[REDACTED]");
    expect(out.user.name).toBe("Ada");
    expect(out.items[0].token).toBe("[REDACTED]");
    expect(out.items[1].id).toBe(1);
  });

  it("caps oversized diffs with a truncation marker", () => {
    const huge = { blob: "x".repeat(AUDIT_DIFF_MAX_BYTES) };
    const capped = capAuditDiff(huge) as Record<string, unknown>;
    expect(capped.truncated).toBe(true);
    expect(capped.maxBytes).toBe(AUDIT_DIFF_MAX_BYTES);
    expect(String(capped.preview)).toContain("[TRUNCATED]");
    expect(Buffer.byteLength(JSON.stringify(capped), "utf8")).toBeLessThan(
      AUDIT_DIFF_MAX_BYTES,
    );
  });
});

describe("AuditLogInterceptor", () => {
  const entityId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let insert: ReturnType<typeof vi.fn>;
  let values: ReturnType<typeof vi.fn>;
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    values = vi.fn().mockResolvedValue(undefined);
    insert = vi.fn(() => ({ values }));
    interceptor = new AuditLogInterceptor({ insert } as never);
  });

  function httpContext(opts: {
    method: string;
    url: string;
    user?: { userId: string; email: string; name: string; role: string };
    body?: unknown;
    params?: Record<string, string>;
  }) {
    const req = {
      method: opts.method,
      url: opts.url,
      originalUrl: opts.url,
      body: opts.body ?? {},
      params: opts.params ?? {},
      user: opts.user,
      route: { path: opts.url },
      baseUrl: "",
    };
    return {
      getType: () => "http" as const,
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    };
  }

  it("creates an audit_log entry for a successful POST", async () => {
    const ctx = httpContext({
      method: "POST",
      url: "/service-requests",
      user: {
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "a@b.com",
        name: "A",
        role: "Admin",
      },
      body: { title: "New", password: "nope" },
    });
    const body = { id: entityId, title: "New" };
    await lastValueFrom(
      interceptor.intercept(ctx as never, { handle: () => of(body) }),
    );
    // allow microtask for void persist
    await Promise.resolve();
    await Promise.resolve();

    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalled();
    const row = values.mock.calls[0][0];
    expect(row.actorId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(row.action).toContain("POST");
    expect(row.entityType).toBe("service-requests");
    expect(row.entityId).toBe(entityId);
    expect(row.diff.request.password).toBe("[REDACTED]");
    expect(row.diff.request.title).toBe("New");
  });

  it("does not audit GET requests", async () => {
    const ctx = httpContext({
      method: "GET",
      url: "/incidents",
      user: {
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "a@b.com",
        name: "A",
        role: "Admin",
      },
    });
    await lastValueFrom(
      interceptor.intercept(ctx as never, { handle: () => of([]) }),
    );
    await Promise.resolve();
    expect(insert).not.toHaveBeenCalled();
  });

  it("skips login/refresh/logout", async () => {
    for (const url of ["/auth/login", "/auth/refresh", "/auth/logout"]) {
      insert.mockClear();
      values.mockClear();
      const ctx = httpContext({
        method: "POST",
        url,
        body: { email: "a@b.com", password: "x" },
      });
      await lastValueFrom(
        interceptor.intercept(ctx as never, {
          handle: () => of({ accessToken: "t" }),
        }),
      );
      await Promise.resolve();
      expect(insert).not.toHaveBeenCalled();
    }
  });

  it("does not record 401/403 as successful mutations", async () => {
    const ctx = httpContext({
      method: "POST",
      url: "/incidents",
      user: {
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "a@b.com",
        name: "A",
        role: "EndUser",
      },
      body: { title: "x" },
    });
    await expect(
      lastValueFrom(
        interceptor.intercept(ctx as never, {
          handle: () => throwError(() => new ForbiddenException()),
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await Promise.resolve();
    expect(insert).not.toHaveBeenCalled();

    await expect(
      lastValueFrom(
        interceptor.intercept(ctx as never, {
          handle: () => throwError(() => new UnauthorizedException()),
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await Promise.resolve();
    expect(insert).not.toHaveBeenCalled();
  });

  it("records 400 failures as status-only audit rows (no body)", async () => {
    const ctx = httpContext({
      method: "POST",
      url: "/changes",
      user: {
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "a@b.com",
        name: "A",
        role: "Agent",
      },
      body: { password: "should-not-appear", title: "x" },
    });
    await expect(
      lastValueFrom(
        interceptor.intercept(ctx as never, {
          handle: () => throwError(() => new BadRequestException("bad")),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await Promise.resolve();
    await Promise.resolve();

    expect(insert).toHaveBeenCalled();
    const row = values.mock.calls[0][0];
    expect(row.action).toBe("POST /changes -> 400");
    expect(row.diff).toEqual({ outcome: "failed", status: 400 });
    expect(row.diff).not.toHaveProperty("request");
  });

  it("does not fail the request when audit DB insert fails", async () => {
    values.mockRejectedValueOnce(new Error("db down"));
    const ctx = httpContext({
      method: "PATCH",
      url: "/changes/:id/status",
      user: {
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "a@b.com",
        name: "A",
        role: "Admin",
      },
      params: { id: entityId },
      body: { status: "Approved" },
    });
    const result = await lastValueFrom(
      interceptor.intercept(ctx as never, {
        handle: () => of({ ok: true }),
      }),
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalled();
  });
});
