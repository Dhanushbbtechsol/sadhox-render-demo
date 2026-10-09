import { ServiceUnavailableException } from "@nestjs/common";

/** Seconds for Retry-After on mapped 503 responses. */
export const DATABASE_UNAVAILABLE_RETRY_AFTER = "30";

export const DATABASE_UNAVAILABLE_BODY = {
  statusCode: 503,
  message: "Service temporarily unavailable",
} as const;

/** Node.js system / network codes when Postgres is unreachable. */
const NODE_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
]);

/**
 * postgres (postgres.js) connection helper codes from cjs/src/connection.js
 * and cjs/src/index.js (Errors.connection).
 */
const POSTGRES_DRIVER_CONNECTION_CODES = new Set([
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "CONNECT_TIMEOUT",
]);

/** Exact SQLSTATE codes that mean the server cannot accept work. */
const SQLSTATE_EXACT = new Set([
  "57P01", // admin_shutdown
  "53300", // too_many_connections
]);

/**
 * Marker exception so callers that already mapped a driver error still get
 * Retry-After + the generic body (cause chain codes are no longer present).
 */
export class DatabaseUnavailableException extends ServiceUnavailableException {
  constructor() {
    super(DATABASE_UNAVAILABLE_BODY.message);
  }
}

function codeOf(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** Walk `cause` (Drizzle wraps driver errors) without looping forever. */
export function walkErrorCauseChain(err: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur !== undefined && cur !== null && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    if (typeof cur !== "object") break;
    cur = (cur as { cause?: unknown }).cause;
  }
  return out;
}

function isUnavailableCode(code: string): boolean {
  if (NODE_NETWORK_CODES.has(code)) return true;
  if (POSTGRES_DRIVER_CONNECTION_CODES.has(code)) return true;
  if (SQLSTATE_EXACT.has(code)) return true;
  // SQLSTATE class 08 — connection_exception
  if (code.length >= 2 && code.startsWith("08")) return true;
  return false;
}

/** True when any error in the cause chain is a DB connectivity failure. */
export function isDatabaseUnavailableError(err: unknown): boolean {
  if (err instanceof DatabaseUnavailableException) return true;
  for (const node of walkErrorCauseChain(err)) {
    const code = codeOf(node);
    if (code && isUnavailableCode(code)) return true;
  }
  return false;
}

export function databaseUnavailableException(): DatabaseUnavailableException {
  return new DatabaseUnavailableException();
}

/** Map DB-down errors; rethrow everything else unchanged. */
export function throwIfDatabaseUnavailable(err: unknown): never {
  if (isDatabaseUnavailableError(err)) {
    throw databaseUnavailableException();
  }
  throw err;
}
