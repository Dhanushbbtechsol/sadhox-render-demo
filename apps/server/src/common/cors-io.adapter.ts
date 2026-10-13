import type { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";

/**
 * Parse CORS_ORIGIN into an allowlist (same parsing HTTP CORS + cookie Origin checks use).
 * Fail closed — never `*`. Today env is typically one URL; comma-separated is supported.
 */
export function parseCorsOriginAllowlist(origin: string): readonly string[] {
  const trimmed = origin.trim();
  if (!trimmed) {
    throw new Error("CORS_ORIGIN is required");
  }
  if (trimmed === "*") {
    throw new Error('CORS_ORIGIN must not be "*"');
  }
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new Error("CORS_ORIGIN is required");
  }
  if (parts.some((part) => part === "*")) {
    throw new Error('CORS_ORIGIN must not be "*"');
  }
  return parts;
}

/**
 * Shared HTTP + Socket.IO CORS settings. Fail closed — never `*`.
 * Call only with a value from validated ConfigService (`getOrThrow`).
 */
export function sharedCorsOptions(origin: string): {
  origin: string | string[];
  credentials: true;
  exposedHeaders: string[];
} {
  const allowlist = parseCorsOriginAllowlist(origin);
  return {
    origin: allowlist.length === 1 ? allowlist[0]! : [...allowlist],
    credentials: true,
    // So the SPA can read download filenames from cross-origin API responses.
    exposedHeaders: ["Content-Disposition"],
  };
}

/** True when the request Origin is in the CORS_ORIGIN allowlist. */
export function isAllowedCorsOrigin(
  requestOrigin: string,
  corsOriginConfig: string,
): boolean {
  return parseCorsOriginAllowlist(corsOriginConfig).includes(
    requestOrigin.trim(),
  );
}

/**
 * Socket.IO adapter that applies CORS from ConfigService after Nest boots
 * (avoids reading process.env at @WebSocketGateway import time).
 */
export class CorsIoAdapter extends IoAdapter {
  private readonly cors: {
    origin: string | string[];
    credentials: true;
    exposedHeaders: string[];
  };

  constructor(app: INestApplication, corsOrigin: string) {
    super(app);
    this.cors = sharedCorsOptions(corsOrigin);
  }

  /** Exposed for tests — origin actually applied to Socket.IO. */
  getCorsOrigin(): string | string[] {
    return this.cors.origin;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IoAdapter uses socket.io ServerOptions; avoid version-skewed imports
  createIOServer(port: number, options?: any): any {
    return super.createIOServer(port, {
      ...options,
      cors: {
        ...(options?.cors ?? {}),
        ...this.cors,
      },
    });
  }
}
