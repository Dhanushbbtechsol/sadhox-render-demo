import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from, switchMap, tap } from "rxjs";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import type { DrizzleDB } from "../../database/database.module";
import {
  assets,
  auditLog,
  changes,
  incidents,
  knowledgeArticles,
  knowledgeCategories,
  problems,
  projects,
  serviceCatalog,
  serviceRequests,
  users,
} from "../../database/schema";
import type { AuthUser } from "../decorators/current-user.decorator";
import { redactAuditValue, capAuditDiff } from "./redact-audit";
import {
  allowlistForPath,
  buildAuditDiff,
  buildCommentDiff,
  createFieldChanges,
  deleteFieldChanges,
  diffFields,
  extractLabel,
  inferAuditEvent,
  normalizeResourceKey,
  pickAuditedSnapshot,
  type AuditScalar,
  type FieldChange,
} from "./audit-diff";

const MUTATING = new Set(["POST", "PATCH", "DELETE"]);

/** Auth endpoints with no durable actor for mutation audit. */
const SKIP_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

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

    return from(this.loadBeforeSnapshot(req, method, path)).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap({
            next: (body) => {
              void this.persistSuccess(req, method, path, body, before);
            },
            error: (err: unknown) => {
              if (this.isAuthFailure(err)) {
                return;
              }
              const status = this.httpStatus(err);
              if (status === 400 || status === 409) {
                void this.persistFailure(req, method, path, status);
                return;
              }
              this.logger.debug(
                `audit skip: mutating ${method} ${path} failed before success`,
              );
            },
          }),
        ),
      ),
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
    before: Record<string, AuditScalar> | null,
  ) {
    const actor = req.user;
    if (!actor?.userId) {
      return;
    }

    try {
      const entityType = this.inferEntityType(path);
      const entityId = this.inferEntityId(req, responseBody);
      const action = `${method} ${path}`;
      const fields = allowlistForPath(path);
      const after = pickAuditedSnapshot(
        this.unwrapEntity(responseBody),
        fields.length ? fields : this.fallbackFields(req.body, responseBody),
      );

      let changes: Record<string, FieldChange>;
      let event = inferAuditEvent(method, path, {});

      if (this.isCommentRoute(path)) {
        const commentId =
          (typeof (responseBody as { id?: unknown })?.id === "string"
            ? (responseBody as { id: string }).id
            : null) ??
          (typeof (responseBody as { data?: { id?: unknown } })?.data?.id ===
          "string"
            ? (responseBody as { data: { id: string } }).data.id
            : null);
        const label = extractLabel(before, after);
        const diff = capAuditDiff(
          redactAuditValue(buildCommentDiff(commentId, label)),
        );
        await this.db.insert(auditLog).values({
          actorId: actor.userId,
          action,
          entityType,
          entityId,
          diff,
        });
        return;
      }

      if (method === "DELETE" && before) {
        changes = deleteFieldChanges(before);
        event = "DELETED";
      } else if (method === "POST" && !before) {
        // Collection create — all fields are new
        const created = Object.keys(after).length
          ? after
          : pickAuditedSnapshot(
              req.body,
              fields.length
                ? fields
                : this.fallbackFields(req.body, responseBody),
            );
        changes = createFieldChanges(created);
        event = inferAuditEvent(method, path, changes);
      } else if (before) {
        // Prefer response snapshot; if thin, merge request body afters onto before
        let afterSnap = after;
        if (Object.keys(afterSnap).length === 0 && req.body) {
          const fromBody = pickAuditedSnapshot(
            req.body,
            fields.length ? fields : Object.keys(before),
          );
          afterSnap = { ...before, ...fromBody };
        } else if (Object.keys(afterSnap).length < Object.keys(before).length) {
          // Partial response — overlay onto before for unchanged keys
          afterSnap = { ...before, ...afterSnap };
        }
        // Also overlay request body keys when response omitted them but body sent them
        if (req.body && typeof req.body === "object") {
          const fromBody = pickAuditedSnapshot(
            req.body,
            fields.length ? fields : Object.keys(before),
          );
          afterSnap = { ...afterSnap, ...fromBody };
        }
        changes = diffFields(before, afterSnap);
        event = inferAuditEvent(method, path, changes);
      } else {
        // POST workflow without before (shouldn't happen often) or create with body only
        const created = Object.keys(after).length
          ? after
          : pickAuditedSnapshot(
              req.body,
              fields.length
                ? fields
                : this.fallbackFields(req.body, responseBody),
            );
        changes = createFieldChanges(created);
        event = inferAuditEvent(method, path, changes);
      }

      const label = extractLabel(before, after, changesLabelSource(changes));
      const diff = capAuditDiff(
        redactAuditValue(
          buildAuditDiff({
            event,
            changes,
            label,
          }),
        ),
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
      const candidates = [
        obj.id,
        (obj.data as { id?: unknown } | undefined)?.id,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && this.isUuid(c)) {
          return c;
        }
      }
    }
    return null;
  }

  private unwrapEntity(body: unknown): unknown {
    if (body == null) return null;
    if (typeof body !== "object") return body;
    return body;
  }

  private isCommentRoute(path: string): boolean {
    return (
      path === "/comments" ||
      path.endsWith("/comments") ||
      path.includes("/comments/")
    );
  }

  private fallbackFields(body: unknown, response: unknown): string[] {
    const keys = new Set<string>();
    for (const src of [body, response]) {
      if (src && typeof src === "object" && !Array.isArray(src)) {
        for (const k of Object.keys(src as object)) {
          if (k === "password" || k === "token" || k === "refreshToken") continue;
          keys.add(k);
        }
      }
    }
    return [...keys];
  }

  /**
   * Load allowlisted before-state for PATCH/DELETE and workflow POSTs on an id.
   */
  private async loadBeforeSnapshot(
    req: AuthedRequest,
    method: string,
    path: string,
  ): Promise<Record<string, AuditScalar> | null> {
    if (method === "POST" && !this.needsBeforeForPost(path)) {
      return null;
    }

    const id = this.snapshotEntityId(req, path);
    if (!id) return null;

    const fields = allowlistForPath(path);
    if (!fields.length) return null;

    try {
      const row = await this.fetchEntityRow(path, id);
      if (!row) return null;
      return pickAuditedSnapshot(row, fields);
    } catch (err) {
      this.logger.debug(
        `audit before-snapshot skipped: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private needsBeforeForPost(path: string): boolean {
    // Workflow POSTs that mutate an existing entity
    return (
      /\/(assign|reopen|comments|approve|reject|fulfill|start-fulfillment|link-ticket|unlink-ticket|members|modules|links)(\/|$)/.test(
        path,
      ) || /\/incidents\/[^/]+\/incidents\//.test(path)
    );
  }

  private snapshotEntityId(req: AuthedRequest, path: string): string | null {
    const paramId =
      (req.params?.id as string | undefined) ??
      (req.params?.ticketId as string | undefined) ??
      (req.params?.moduleId as string | undefined);
    if (paramId && this.isUuid(paramId)) return paramId;

    // Fall back: first UUID in the concrete URL
    const url = req.originalUrl?.split("?")[0] ?? path;
    const match = url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    return match?.[0] ?? null;
  }

  private async fetchEntityRow(
    path: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const resource = normalizeResourceKey(path);
    const parts = path.split("/").filter(Boolean);

    if (resource === "incidents") {
      const [row] = await this.db
        .select()
        .from(incidents)
        .where(eq(incidents.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "problems") {
      const [row] = await this.db
        .select()
        .from(problems)
        .where(eq(problems.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "service-requests") {
      const [row] = await this.db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "changes") {
      const [row] = await this.db
        .select()
        .from(changes)
        .where(eq(changes.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "assets") {
      const [row] = await this.db
        .select()
        .from(assets)
        .where(eq(assets.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "projects") {
      const [row] = await this.db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "service-catalog") {
      const [row] = await this.db
        .select()
        .from(serviceCatalog)
        .where(eq(serviceCatalog.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "admin" && parts.includes("users")) {
      const [row] = await this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          referenceCode: users.referenceCode,
          reportsToId: users.reportsToId,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return row ?? null;
    }
    if (resource === "knowledge") {
      if (parts.includes("articles")) {
        const [row] = await this.db
          .select()
          .from(knowledgeArticles)
          .where(eq(knowledgeArticles.id, id))
          .limit(1);
        return row ?? null;
      }
      if (parts.includes("categories")) {
        const [row] = await this.db
          .select()
          .from(knowledgeCategories)
          .where(eq(knowledgeCategories.id, id))
          .limit(1);
        return row ?? null;
      }
    }
    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}

/** Pull label strings out of after-sides of field changes. */
function changesLabelSource(
  changes: Record<string, FieldChange>,
): Record<string, AuditScalar> {
  const out: Record<string, AuditScalar> = {};
  for (const [key, pair] of Object.entries(changes)) {
    if (pair.after != null) out[key] = pair.after;
  }
  return out;
}
