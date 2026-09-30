/** Shared HTTP throttle limits — keep login and global defaults in one place. */
export const THROTTLE_GLOBAL = {
  name: "default" as const,
  ttl: 60_000,
  limit: 100,
};

export const THROTTLE_AUTH_LOGIN = {
  default: { limit: 5, ttl: 60_000 },
};
