import { z } from "zod";

export type SocketUser = {
  id: string;
  role: string;
};

export type JwtAccessPayload = {
  sub: string;
  email: string;
  role: string;
  name?: string;
  /** Unix seconds — used to schedule WS disconnect at expiry */
  exp?: number;
};

/**
 * Extract JWT from handshake.auth.token only.
 * query.token is allowed solely when allowQueryToken is true (development).
 * Never log the token value.
 */
export function extractHandshakeToken(
  handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
  },
  options: { allowQueryToken?: boolean } = {},
): string | undefined {
  const fromAuth = handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.trim().length > 0) {
    return fromAuth.trim();
  }

  if (options.allowQueryToken) {
    const fromQuery = handshake.query?.token;
    if (typeof fromQuery === "string" && fromQuery.trim().length > 0) {
      return fromQuery.trim();
    }
    if (Array.isArray(fromQuery) && typeof fromQuery[0] === "string") {
      const t = fromQuery[0].trim();
      return t.length > 0 ? t : undefined;
    }
  }

  return undefined;
}

/** Delay until JWT `exp` (unix seconds). Returns 0 if already expired / missing. */
export function msUntilJwtExpiry(exp: number | undefined, nowMs = Date.now()): number {
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return 0;
  }
  return Math.max(0, exp * 1000 - nowMs);
}

const ticketRoomSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ticketId is required")
    .refine(
      (v) =>
        z.string().uuid().safeParse(v).success ||
        /^[A-Za-z0-9_-]{1,128}$/.test(v),
      "ticketId must be a uuid or non-empty id",
    ),
});

export function parseTicketRoomPayload(payload: unknown): { ticketId: string } {
  return ticketRoomSchema.parse(payload);
}

export function ticketRoomName(ticketId: string): string {
  return `ticket:${ticketId}`;
}
