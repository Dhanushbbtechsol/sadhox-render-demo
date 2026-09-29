import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import type { Request } from "express";
import { DRIZZLE } from "../../database/database.constants";
import type { DrizzleDB } from "../../database/database.module";
import { auditLog } from "../../database/schema";
import type { AuthUser } from "../decorators/current-user.decorator";
import { redactAuditValue, capAuditDiff } from "./redact-audit";

const MUTATING = new Set(["POST", "PATCH", "DELETE"]);

/** Auth endpoints with no durable actor for mutation audit. */
const SKIP_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
];

type AuthedRequest = Request & { user?: AuthUser };

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const method = (req.method ?? "").toUpperCase();
    if (!MUTATING.has(method)) {
      return next.handle();
    }

    const path = this.normalizePath(req);
    if (SKIP_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (body) => {
          // Successful handler result only — authorization failures never land here.
          void this.persistSuccess(req, method, path, body);
        },
        error: (err: unknown) => {
          if (this.isAuthFailure(err)) {
            return;
          }
          const status = this.httpStatus(err);
          // Trail validation / conflict failures without request bodies.
          if (status === 400 || status === 409) {
            void this.persistFailure(req, method, path, status);
            return;
          }
          this.logger.debug(
            `audit skip: mutating ${method} ${path} failed before success`,
          );
        },
      }),
    );
  }

  private isAuthFailure(err: unknown): boolean {
    const status = this.httpStatus(err);
    return status === 401 || status === 403;
  }

  private httpStatus(err: unknown): number | undefined {
    if (err instanceof HttpException) {
      return err.getStatus();
    }
    return undefined;
  }

  private normalizePath(req: AuthedRequest): string {
    const raw =
      (typeof req.route?.path === "string" && req.baseUrl
        ? `${req.baseUrl}${req.route.path}`
        : undefined) ??
      req.originalUrl?.split("?")[0] ??
      req.url?.split("?")[0] ??
      "";
    return raw.replace(/\/+$/, "") || "/";
  }

  private async persistSuccess(
    req: AuthedRequest,
    method: string,
    path: string,
    responseBody: unknown,
  ) {
    const actor = req.user;
    if (!actor?.userId) {
      // Unauthenticated mutating route — skip (covers public auth already skipped).
      return;
    }

    try {
      const entityType = this.inferEntityType(path);
      const entityId = this.inferEntityId(req, responseBody);
      const action = `${method} ${path}`;

      // Redact BEFORE building the persisted payload, then cap size.
      const redactedBody = redactAuditValue(req.body ?? {});
      const redactedResponse = redactAuditValue(
        this.pickResponseSnapshot(responseBody),
      );
      const diff = capAuditDiff(
        redactAuditValue({
          request: redactedBody,
          response: redactedResponse,
        }),
      );

      await this.db.insert(auditLog).values({
        actorId: actor.userId,
        action,
        entityType,
        entityId,
        diff,
      });
    } catch (err) {
      this.logger.error(
        "Failed to write audit_log (request not affected)",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /** Status-only trail for 400/409 — no request/response bodies. */
  private async persistFailure(
    req: AuthedRequest,
    method: string,
    path: string,
    status: number,
  ) {
    const actor = req.user;
    if (!actor?.userId) {
      return;
    }

    try {
      await this.db.insert(auditLog).values({
        actorId: actor.userId,
        action: `${method} ${path} -> ${status}`,
        entityType: this.inferEntityType(path),
        entityId: this.inferEntityId(req, null),
        diff: { outcome: "failed", status },
      });
    } catch (err) {
      this.logger.error(
        "Failed to write audit_log failure trail (request not affected)",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private inferEntityType(path: string): string {
    const parts = path.split("/").filter(Boolean);
    return parts[0] ?? "unknown";
  }

  private inferEntityId(
    req: AuthedRequest,
    responseBody: unknown,
  ): string | null {
    const fromParams =
      (req.params?.id as string | undefined) ??
      (req.params?.ticketId as string | undefined);
    if (fromParams && this.isUuid(fromParams)) {
      return fromParams;
    }

    if (responseBody && typeof responseBody === "object") {
      const obj = responseBody as Record<string, unknown>;
      const candidates = [obj.id, (obj.data as { id?: unknown } | undefined)?.id];
      for (const c of candidates) {
        if (typeof c === "string" && this.isUuid(c)) {
          return c;
        }
      }
    }
    return null;
  }

  private pickResponseSnapshot(body: unknown): unknown {
    if (body == null) return null;
    if (typeof body !== "object") return body;
    // Bound size: keep shallow-ish snapshot for audit
    return body;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
