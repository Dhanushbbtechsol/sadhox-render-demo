import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import {
  isAllowedCorsOrigin,
  parseCorsOriginAllowlist,
} from "../common/cors-io.adapter";

/**
 * CSRF defense for credentialed cross-site refresh cookie (SameSite=None in prod).
 * Checks Origin against the same CORS_ORIGIN allowlist as HTTP/Socket CORS.
 * Does not require a custom header (would break the current SPA).
 */
@Injectable()
export class RefreshCookieOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "development";
    const isProd = nodeEnv === "production";
    const corsOrigin = this.config.getOrThrow<string>("CORS_ORIGIN");
    // Validate config parses (same helper as enableCors).
    parseCorsOriginAllowlist(corsOrigin);

    const originHeader = req.headers.origin;
    const origin =
      typeof originHeader === "string" ? originHeader.trim() : undefined;

    if (!origin) {
      if (isProd) {
        throw new ForbiddenException("Missing Origin header");
      }
      // development + test: curl / Supertest without Origin
      return true;
    }

    if (!isAllowedCorsOrigin(origin, corsOrigin)) {
      throw new ForbiddenException("Origin not allowed");
    }
    return true;
  }
}
