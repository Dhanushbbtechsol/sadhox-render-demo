import type { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";

/**
 * Shared HTTP + Socket.IO CORS settings. Fail closed — never `*`.
 * Call only with a value from validated ConfigService (`getOrThrow`).
 */
export function sharedCorsOptions(origin: string): {
  origin: string;
  credentials: true;
} {
  const trimmed = origin.trim();
  if (!trimmed) {
    throw new Error("CORS_ORIGIN is required");
  }
  if (trimmed === "*") {
    throw new Error('CORS_ORIGIN must not be "*"');
  }
  return { origin: trimmed, credentials: true };
}

/**
 * Socket.IO adapter that applies CORS from ConfigService after Nest boots
 * (avoids reading process.env at @WebSocketGateway import time).
 */
export class CorsIoAdapter extends IoAdapter {
  private readonly cors: { origin: string; credentials: true };

  constructor(app: INestApplication, corsOrigin: string) {
    super(app);
    this.cors = sharedCorsOptions(corsOrigin);
  }

  /** Exposed for tests — origin actually applied to Socket.IO. */
  getCorsOrigin(): string {
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
