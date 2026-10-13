/** Shared HTTP throttle limits — keep login and global defaults in one place. */
export const THROTTLE_GLOBAL = {
  name: "default" as const,
  ttl: 60_000,
  limit: 100,
};

/**
 * Override via env for load tests (e.g. THROTTLE_GLOBAL_LIMIT=10000).
 * Production cannot raise the limit above THROTTLE_GLOBAL.limit.
 */
export function resolveThrottleGlobal(opts?: {
  limit?: number;
  ttl?: number;
  nodeEnv?: string;
}): typeof THROTTLE_GLOBAL {
  const ttl = opts?.ttl && opts.ttl > 0 ? opts.ttl : THROTTLE_GLOBAL.ttl;
  const requested =
    opts?.limit && opts.limit > 0 ? opts.limit : THROTTLE_GLOBAL.limit;
  const limit =
    opts?.nodeEnv === "production"
      ? Math.min(requested, THROTTLE_GLOBAL.limit)
      : requested;
  return {
    name: "default",
    ttl,
    limit,
  };
}

export const THROTTLE_AUTH_LOGIN = {
  default: { limit: 5, ttl: 60_000 },
};

/** Refresh and logout share this band. */
export const THROTTLE_AUTH_SESSION = {
  default: { limit: 10, ttl: 60_000 },
};

/** CSV / desk exports. */
export const THROTTLE_REPORT = {
  default: { limit: 10, ttl: 60_000 },
};
