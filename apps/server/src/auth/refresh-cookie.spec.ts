import { describe, expect, it } from "vitest";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "./refresh-cookie";

describe("refreshCookieOptions (cross-site aware)", () => {
  it("dev: HttpOnly + SameSite=Lax (same-site localhost; no Secure on HTTP)", () => {
    const opts = refreshCookieOptions("development");
    expect(REFRESH_COOKIE_NAME).toBe("refresh_token");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(false);
    expect(opts.path).toBe("/auth");
  });

  it("production: SameSite=None + Secure (required for cross-site credentialed fetch)", () => {
    const opts = refreshCookieOptions("production");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
    expect(opts.path).toBe("/auth");
  });

  it("documents why Lax/Strict cannot be used for Vercel→Render refresh XHR", () => {
    // Cross-site POST/fetch never attaches Strict or Lax cookies.
    // Only None (+ Secure) is sent on credentials:include from another site.
    expect(refreshCookieOptions("production").sameSite).not.toBe("strict");
    expect(refreshCookieOptions("production").sameSite).not.toBe("lax");
  });
});
