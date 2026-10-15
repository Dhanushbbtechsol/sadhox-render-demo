/** Barrax-inspired audit diff builders: typed event + field before→after. */

export type AuditScalar = string | number | boolean | null;

export type FieldChange = { before: AuditScalar; after: AuditScalar };

export type AuditEvent =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "REASSIGNED"
  | "COMMENT_ADDED"
  | "APPROVED"
  | "REJECTED"
  | "FULFILLED"
  | "LINKED"
  | "UNLINKED"
  | "SLA_BREACHED"
  | "REPORT_EXPORTED"
  | "LOGIN_FAILED";

/** Label keys the Admin UI extractNames() looks for. */
export const LABEL_KEYS = [
  "title",
  "name",
  "email",
  "assetTag",
  "referenceCode",
] as const;

/**
 * Scalar fields we record per resource (first URL segment → allowlist).
 * Prefer human-readable *Name fields over raw UUID foreign keys for Admin UI.
 */
export const AUDITED_FIELDS: Record<string, readonly string[]> = {
  incidents: [
    "title",
    "referenceCode",
    "status",
    "priority",
    "impact",
    "urgency",
    "category",
    "subcategory",
    "assigneeName",
    "reporterName",
    "projectName",
    "moduleName",
    "slaBreached",
  ],
  problems: [
    "title",
    "referenceCode",
    "status",
    "assigneeName",
    "knownError",
    "projectName",
    "moduleName",
  ],
  "service-requests": [
    "title",
    "referenceCode",
    "status",
    "urgency",
    "catalogName",
    "requesterName",
    "approverName",
    "assigneeName",
    "projectName",
    "moduleName",
  ],
  changes: [
    "title",
    "referenceCode",
    "status",
    "type",
    "createdByName",
    "projectName",
    "moduleName",
  ],
  assets: [
    "name",
    "assetTag",
    "referenceCode",
    "type",
    "status",
    "ownerName",
    "serialNumber",
    "location",
  ],
  projects: ["name", "referenceCode", "managerId"],
  "service-catalog": ["name", "department", "subcategory", "isActive"],
  admin: ["name", "email", "role", "referenceCode", "reportsToId"],
  knowledge: ["title", "name", "slug", "status", "categoryId", "authorId"],
  comments: ["id"],
};

const DATE_LIKE =
  /^(createdAt|updatedAt|resolvedAt|closedAt|approvedAt|fulfilledAt|assignedAt|scheduledStart|scheduledEnd|slaDueAt)$/;

export function normalizeResourceKey(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "knowledge") return "knowledge";
  if (parts[0] === "admin") return "admin";
  if (parts[0] === "comments") return "comments";
  return parts[0] ?? "unknown";
}

export function allowlistForPath(path: string): readonly string[] {
  const key = normalizeResourceKey(path);
  return AUDITED_FIELDS[key] ?? [];
}

function isScalar(value: unknown): value is AuditScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** Coerce dates / unknowns to audit scalars; drop objects/arrays. */
export function toAuditScalar(value: unknown): AuditScalar | undefined {
  if (value === undefined) return undefined;
  if (isScalar(value)) return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

/**
 * Pick allowlisted scalar fields from an entity-like object (DB row or response).
 * Flattens common nestings (`data`, top-level) and nested people (`assignee.name`).
 */
export function pickAuditedSnapshot(
  source: unknown,
  fields: readonly string[],
): Record<string, AuditScalar> {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }
  const root = source as Record<string, unknown>;
  const bags: Record<string, unknown>[] = [root];
  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    bags.push(root.data as Record<string, unknown>);
  }

  // Flatten nested snippets so assigneeName / reporterName resolve from API shapes.
  const flattened: Record<string, unknown> = {};
  for (const bag of bags) {
    for (const [nestKey, nestVal] of Object.entries(bag)) {
      if (!nestVal || typeof nestVal !== "object" || Array.isArray(nestVal)) {
        continue;
      }
      const nested = nestVal as Record<string, unknown>;
      if (typeof nested.name === "string" && nested.name.trim()) {
        flattened[`${nestKey}Name`] ??= nested.name.trim();
      }
    }
  }
  bags.push(flattened);

  const out: Record<string, AuditScalar> = {};
  for (const field of fields) {
    for (const bag of bags) {
      if (!(field in bag)) continue;
      const scalar = toAuditScalar(bag[field]);
      if (scalar !== undefined) {
        out[field] = scalar;
        break;
      }
    }
  }
  return out;
}

/** Changed keys only as `{ before, after }` pairs. */
export function diffFields(
  before: Record<string, AuditScalar> | null | undefined,
  after: Record<string, AuditScalar> | null | undefined,
): Record<string, FieldChange> {
  const a = before ?? {};
  const b = after ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changes: Record<string, FieldChange> = {};
  for (const key of keys) {
    if (DATE_LIKE.test(key)) continue;
    const left = key in a ? a[key]! : null;
    const right = key in b ? b[key]! : null;
    if (String(left) === String(right)) continue;
    changes[key] = { before: left, after: right };
  }
  return changes;
}

/** Create: every after value as `{ before: null, after }`. */
export function createFieldChanges(
  after: Record<string, AuditScalar>,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const [key, value] of Object.entries(after)) {
    if (DATE_LIKE.test(key)) continue;
    changes[key] = { before: null, after: value };
  }
  return changes;
}

/** Delete: every before value as `{ before, after: null }`. */
export function deleteFieldChanges(
  before: Record<string, AuditScalar>,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const [key, value] of Object.entries(before)) {
    if (DATE_LIKE.test(key)) continue;
    changes[key] = { before: value, after: null };
  }
  return changes;
}

export function extractLabel(
  ...sources: Array<Record<string, AuditScalar> | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const key of LABEL_KEYS) {
      const value = source[key];
      if (typeof value === "string" && value.trim() && !out[key]) {
        out[key] = value.trim();
      }
    }
  }
  return out;
}

function pathHas(path: string, segment: string): boolean {
  return path.split("/").includes(segment);
}

/**
 * Infer a typed event from HTTP method, path, and which fields changed.
 */
export function inferAuditEvent(
  method: string,
  path: string,
  changes: Record<string, FieldChange>,
): AuditEvent {
  const m = method.toUpperCase();
  const normalized = path.replace(/\/+$/, "");

  if (pathHas(normalized, "comments") || /\/comments$/.test(normalized)) {
    return "COMMENT_ADDED";
  }
  if (pathHas(normalized, "approve")) return "APPROVED";
  if (pathHas(normalized, "reject")) return "REJECTED";
  if (pathHas(normalized, "fulfill") || pathHas(normalized, "start-fulfillment")) {
    return "FULFILLED";
  }
  if (pathHas(normalized, "unlink-ticket")) return "UNLINKED";
  if (pathHas(normalized, "link-ticket") || pathHas(normalized, "link")) {
    return "LINKED";
  }
  if (
    pathHas(normalized, "incidents") &&
    /\/incidents\/[^/]+\/incidents\//.test(normalized)
  ) {
    return "LINKED";
  }
  if (pathHas(normalized, "assign") || pathHas(normalized, "reopen")) {
    const assigneeChange = changes.assignedTo ?? changes.ownerId ?? changes.assigneeId;
    if (assigneeChange && assigneeChange.before != null) return "REASSIGNED";
    return "ASSIGNED";
  }

  if (m === "DELETE") return "DELETED";
  if (m === "POST") {
    // Collection create vs workflow POST on an id
    const parts = normalized.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        last,
      );
    // POST /resource or POST /resource/:id/sub — if ends with resource plural or no action, CREATED
    if (
      parts.length <= 2 &&
      !["assign", "reopen", "comments", "members", "modules", "links"].includes(
        last,
      )
    ) {
      return "CREATED";
    }
    if (parts.length === 1 || (parts.length === 2 && isUuid)) {
      return "CREATED";
    }
    // POST members / modules still "created" semantically for summary; use CREATED
    if (last === "members" || last === "modules" || last === "links") {
      return "CREATED";
    }
  }

  const changeKeys = Object.keys(changes);
  if (
    changeKeys.length === 1 &&
    changeKeys[0] === "status"
  ) {
    return "STATUS_CHANGED";
  }
  if (
    changeKeys.includes("assignedTo") ||
    changeKeys.includes("ownerId") ||
    changeKeys.includes("assigneeId")
  ) {
    const assigneeChange =
      changes.assignedTo ?? changes.ownerId ?? changes.assigneeId;
    if (assigneeChange && assigneeChange.before != null) return "REASSIGNED";
    if (assigneeChange) return "ASSIGNED";
  }
  if (changeKeys.includes("status") && changeKeys.length <= 3) {
    // status plus timestamps-ish — prefer STATUS_CHANGED when status moved
    if (changes.status) return "STATUS_CHANGED";
  }

  if (m === "POST") return "CREATED";
  return "UPDATED";
}

export function buildAuditDiff(input: {
  event: AuditEvent | string;
  changes?: Record<string, FieldChange>;
  label?: Record<string, string>;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  // Label scalars must win over field pairs for the same key so Admin
  // extractNames() still finds title/name/email as strings.
  const changes = { ...(input.changes ?? {}) };
  for (const key of LABEL_KEYS) {
    if (input.label?.[key] != null) {
      delete changes[key];
    }
  }
  return {
    event: input.event,
    ...changes,
    ...(input.extra ?? {}),
    ...(input.label ?? {}),
  };
}

/** Comment routes: pointer only — never persist body/text. */
export function buildCommentDiff(
  commentId: string | null,
  label?: Record<string, string>,
): Record<string, unknown> {
  return buildAuditDiff({
    event: "COMMENT_ADDED",
    label,
    changes: {
      commentId: { before: null, after: commentId },
    },
  });
}
