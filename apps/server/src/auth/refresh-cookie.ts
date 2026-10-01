/**
 * Refresh-cookie policy for SPA auth.
 *
 * Production topology: frontend on Vercel, API on Render —
 * different registrable domains ⇒ cross-site.
 * Refresh is `fetch(VITE_SERVER_URL/auth/refresh, { credentials: "include" })`
 * (XHR), not a top-level navigation.
 *
 * SameSite matrix for that call:
 * - Strict: cookie withheld on all cross-site requests → refresh broken
 * - Lax:    cookie withheld on cross-site XHR/fetch POST → refresh broken
 * - None:   cookie sent cross-site; requires Secure (HTTPS) → correct for prod
 *
 * Dev (localhost:5173 → localhost:3000) is same-site (special localhost rules),
 * so Lax works without Secure on plain HTTP.
 */
export const REFRESH_COOKIE_NAME = "refresh_token";

export type RefreshCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  path: "/auth";
  maxAge: number;
};

/** Cookie flags for the current NODE_ENV (or override for tests). */
export function refreshCookieOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): RefreshCookieOptions {
  const isProd = nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
