/** Shared HTTP throttle limits — keep login and global defaults in one place. */
export const THROTTLE_GLOBAL = {
  name: "default" as const,
  ttl: 60_000,
  limit: 100,
};

/** Override via env for load tests (e.g. THROTTLE_GLOBAL_LIMIT=10000). */
export function resolveThrottleGlobal(opts?: {
  limit?: number;
  ttl?: number;
}): typeof THROTTLE_GLOBAL {
  return {
    name: "default",
    ttl: opts?.ttl && opts.ttl > 0 ? opts.ttl : THROTTLE_GLOBAL.ttl,
    limit: opts?.limit && opts.limit > 0 ? opts.limit : THROTTLE_GLOBAL.limit,
  };
}

export const THROTTLE_AUTH_LOGIN = {
  default: { limit: 5, ttl: 60_000 },
};

/** Desk report export (Admin + Manager) — 10 per minute. */
export const THROTTLE_DESK_REPORT = {
  default: { limit: 10, ttl: 60_000 },
};
