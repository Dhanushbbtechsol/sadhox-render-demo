import type { AuditLog } from "./types";

type ActivityVerb =
  | "created"
  | "updated"
  | "deleted"
  | "added"
  | "removed"
  | "assigned"
  | "approved"
  | "rejected"
  | "fulfilled"
  | "linked"
  | "changed role for"
  | "commented on";

type ActivityRule = {
  re: RegExp;
  verb: ActivityVerb;
  /** Noun phrase after the verb, e.g. "a user", "project". */
  object: string;
  /** Prefer a name from request/response when present. */
  nameKeys?: string[];
};

/** Full sentence: who (role) did what — optionally naming the target. */
export function formatAuditSummary(entry: AuditLog): string {
  const who = formatActor(entry);
  const detail = describeActivity(entry);

  if (detail.kind === "system") {
    return detail.text ?? who;
  }

  const failed = detail.failed ? " (failed)" : "";
  if (detail.targetName) {
    return `${who} ${detail.verb} ${detail.object} “${detail.targetName}”${failed}`;
  }
  return `${who} ${detail.verb} ${detail.object}${failed}`;
}

/**
 * Action-only label (no actor) for tables/exports that already scope to a person.
 * Never returns raw `METHOD /path` when the path can be mapped.
 */
export function formatAuditAction(
  entry: Pick<AuditLog, "action" | "entityType"> & { diff?: unknown },
): string {
  const detail = describeActivity({
    id: "",
    actor: "",
    action: entry.action,
    entityType: entry.entityType,
    entityId: null,
    createdAt: "",
    diff: entry.diff,
  });

  if (detail.kind === "system") {
    return detail.text ?? entry.action.trim();
  }

  const failed = detail.failed ? " (failed)" : "";
  const core = detail.targetName
    ? `${detail.verb} ${detail.object} “${detail.targetName}”`
    : `${detail.verb} ${detail.object}`;
  return sentenceCase(core) + failed;
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Short actor label for secondary lines. */
export function formatAuditActorLine(entry: AuditLog): string {
  return formatActor(entry);
}

function formatActor(entry: AuditLog): string {
  const name = entry.actor?.trim() || "System";
  if (entry.actorRole) {
    return `${name} (${entry.actorRole})`;
  }
  return name;
}

function describeActivity(entry: AuditLog): {
  kind: "http" | "system";
  verb: string;
  object: string;
  targetName?: string;
  failed?: boolean;
  text?: string;
} {
  const raw = entry.action.trim();

  if (!raw.includes(" ") && raw.includes(".")) {
    return {
      kind: "system",
      verb: "",
      object: "",
      text: SYSTEM_ACTIONS[raw] ?? titleCase(raw.replace(/[._]/g, " ")),
    };
  }

  const failed = /\s*->\s*\d+\s*$/.test(raw);
  const withoutStatus = raw.replace(/\s*->\s*\d+\s*$/, "").trim();
  const match = withoutStatus.match(/^(POST|PATCH|PUT|DELETE)\s+(.+)$/i);
  if (!match) {
    return {
      kind: "system",
      verb: "",
      object: "",
      text: failed ? `${withoutStatus} (failed)` : withoutStatus,
    };
  }

  const method = match[1]!.toUpperCase();
  const path = normalizePath(match[2]!);
  const key = `${method} ${path}`;
  const names = extractNames(entry.diff);

  for (const rule of ACTIVITY_RULES) {
    if (rule.re.test(key)) {
      const targetName = pickName(names, rule.nameKeys);
      return {
        kind: "http",
        verb: rule.verb,
        object: rule.object,
        targetName,
        failed,
      };
    }
  }

  const resource = humanResource(path, entry.entityType);
  const verb =
    method === "POST"
      ? "created"
      : method === "DELETE"
        ? "deleted"
        : "updated";
  return {
    kind: "http",
    verb,
    object: articleFor(resource),
    targetName: pickName(names, ["name", "title", "email"]),
    failed,
  };
}

const SYSTEM_ACTIONS: Record<string, string> = {
  "auth.login_failed": "Someone tried to sign in and failed",
  "system.sla_breach": "System marked a missed response time",
  "system.auto_close": "System auto-closed a ticket",
};

const ACTIVITY_RULES: ActivityRule[] = [
  {
    re: /^POST \/admin\/users$/,
    verb: "created",
    object: "a user",
    nameKeys: ["name", "email"],
  },
  {
    re: /^PATCH \/admin\/users\/:id$/,
    verb: "updated",
    object: "a user",
    nameKeys: ["name", "email"],
  },
  {
    re: /^PATCH \/admin\/users\/:id\/role$/,
    verb: "changed role for",
    object: "a user",
    nameKeys: ["name", "email", "role"],
  },

  {
    re: /^POST \/projects$/,
    verb: "created",
    object: "a project",
    nameKeys: ["name"],
  },
  {
    re: /^PATCH \/projects\/:id$/,
    verb: "updated",
    object: "a project",
    nameKeys: ["name"],
  },
  {
    re: /^DELETE \/projects\/:id$/,
    verb: "deleted",
    object: "a project",
    nameKeys: ["name"],
  },
  {
    re: /^POST \/projects\/:id\/members$/,
    verb: "added",
    object: "a project member",
    nameKeys: ["name", "email", "userId"],
  },
  {
    re: /^DELETE \/projects\/:id\/members\/:id$/,
    verb: "removed",
    object: "a project member",
    nameKeys: ["name", "email"],
  },
  {
    re: /^POST \/projects\/:id\/modules$/,
    verb: "created",
    object: "a module",
    nameKeys: ["name"],
  },
  {
    re: /^PATCH \/projects\/:id\/modules\/:id$/,
    verb: "updated",
    object: "a module",
    nameKeys: ["name"],
  },
  {
    re: /^DELETE \/projects\/:id\/modules\/:id$/,
    verb: "deleted",
    object: "a module",
    nameKeys: ["name"],
  },

  {
    re: /^POST \/incidents$/,
    verb: "created",
    object: "a ticket",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/incidents\/:id$/,
    verb: "updated",
    object: "a ticket",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/incidents\/:id\/assign$/,
    verb: "assigned",
    object: "a ticket",
    nameKeys: ["title", "assignedTo"],
  },
  {
    re: /^POST \/incidents\/:id\/comments$/,
    verb: "commented on",
    object: "a ticket",
    nameKeys: ["title"],
  },

  {
    re: /^POST \/problems$/,
    verb: "created",
    object: "an issue",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/problems\/:id$/,
    verb: "updated",
    object: "an issue",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/problems\/:id\/incidents\/:id$/,
    verb: "linked",
    object: "a ticket to an issue",
  },

  {
    re: /^POST \/service-requests$/,
    verb: "created",
    object: "a request",
    nameKeys: ["title", "name"],
  },
  {
    re: /^PATCH \/service-requests\/:id$/,
    verb: "updated",
    object: "a request",
    nameKeys: ["title", "name"],
  },
  {
    re: /^POST \/service-requests\/:id\/approve$/,
    verb: "approved",
    object: "a request",
  },
  {
    re: /^POST \/service-requests\/:id\/reject$/,
    verb: "rejected",
    object: "a request",
  },
  {
    re: /^POST \/service-requests\/:id\/fulfill$/,
    verb: "fulfilled",
    object: "a request",
  },

  {
    re: /^POST \/changes$/,
    verb: "created",
    object: "a change request",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/changes\/:id$/,
    verb: "updated",
    object: "a change request",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/changes\/:id\/approve$/,
    verb: "approved",
    object: "a change request",
  },
  {
    re: /^POST \/changes\/:id\/reject$/,
    verb: "rejected",
    object: "a change request",
  },

  {
    re: /^POST \/assets$/,
    verb: "created",
    object: "an asset",
    nameKeys: ["name", "assetTag"],
  },
  {
    re: /^PATCH \/assets\/:id$/,
    verb: "updated",
    object: "an asset",
    nameKeys: ["name", "assetTag"],
  },
  {
    re: /^DELETE \/assets\/:id$/,
    verb: "deleted",
    object: "an asset",
    nameKeys: ["name", "assetTag"],
  },
  {
    re: /^POST \/assets\/:id\/link$/,
    verb: "linked",
    object: "an asset to a ticket",
  },

  {
    re: /^POST \/service-catalog$/,
    verb: "created",
    object: "a catalog item",
    nameKeys: ["name"],
  },
  {
    re: /^PATCH \/service-catalog\/:id$/,
    verb: "updated",
    object: "a catalog item",
    nameKeys: ["name"],
  },
  {
    re: /^DELETE \/service-catalog\/:id$/,
    verb: "deleted",
    object: "a catalog item",
    nameKeys: ["name"],
  },

  {
    re: /^POST \/knowledge\/categories$/,
    verb: "created",
    object: "a knowledge category",
    nameKeys: ["name"],
  },
  {
    re: /^PATCH \/knowledge\/categories\/:id$/,
    verb: "updated",
    object: "a knowledge category",
    nameKeys: ["name"],
  },
  {
    re: /^DELETE \/knowledge\/categories\/:id$/,
    verb: "deleted",
    object: "a knowledge category",
    nameKeys: ["name"],
  },
  {
    re: /^POST \/knowledge\/articles$/,
    verb: "created",
    object: "a knowledge article",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/knowledge\/articles\/:id$/,
    verb: "updated",
    object: "a knowledge article",
    nameKeys: ["title"],
  },
  {
    re: /^DELETE \/knowledge\/articles\/:id$/,
    verb: "deleted",
    object: "a knowledge article",
    nameKeys: ["title"],
  },

  {
    re: /^PATCH \/admin\/sla-rules$/,
    verb: "updated",
    object: "a response time",
    nameKeys: ["priority"],
  },
  {
    re: /^PATCH \/admin\/sla-rules\/:id$/,
    verb: "updated",
    object: "a response time",
    nameKeys: ["priority"],
  },

  {
    re: /^POST \/comments$/,
    verb: "added",
    object: "a comment",
  },
];

function normalizePath(path: string): string {
  return path
    .split("?")[0]!
    .replace(/\/+$/, "")
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      ":id",
    )
    .replace(/:[A-Za-z]+/g, ":id");
}

function extractNames(diff: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!diff || typeof diff !== "object") return out;
  const record = diff as Record<string, unknown>;
  const bags = [record.request, record.response, record].filter(
    (v) => v && typeof v === "object",
  ) as Record<string, unknown>[];

  for (const bag of bags) {
    for (const [key, value] of Object.entries(bag)) {
      if (typeof value === "string" && value.trim() && !isUuid(value)) {
        out[key] ??= value.trim();
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const nestedKey of ["name", "title", "email", "assetTag"]) {
          const nestedVal = nested[nestedKey];
          if (
            typeof nestedVal === "string" &&
            nestedVal.trim() &&
            !isUuid(nestedVal)
          ) {
            out[nestedKey] ??= nestedVal.trim();
          }
        }
      }
    }
  }
  return out;
}

function pickName(
  names: Record<string, string>,
  keys: string[] | undefined,
): string | undefined {
  if (!keys) return undefined;
  for (const key of keys) {
    if (names[key]) return names[key];
  }
  return undefined;
}

function humanResource(path: string, entityType: string): string {
  const segments = path.split("/").filter(Boolean).filter((s) => s !== ":id");
  const last = segments[segments.length - 1] ?? entityType ?? "record";
  const map: Record<string, string> = {
    users: "user",
    projects: "project",
    members: "project member",
    modules: "module",
    incidents: "ticket",
    problems: "issue",
    "service-requests": "request",
    changes: "change request",
    assets: "asset",
    "service-catalog": "catalog item",
    articles: "knowledge article",
    categories: "knowledge category",
    comments: "comment",
    "sla-rules": "response time",
    admin: "admin record",
  };
  return map[last] ?? last.replace(/-/g, " ").toLowerCase();
}

function articleFor(resource: string): string {
  const lower = resource.toLowerCase();
  if (/^[aeiou]/i.test(lower)) return `an ${lower}`;
  return `a ${lower}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** UUID foreign keys → companion *Name fields when both appear in a diff. */
const ID_TO_NAME_FIELD: Record<string, string> = {
  catalogId: "catalogName",
  requesterId: "requesterName",
  approverId: "approverName",
  assignedTo: "assigneeName",
  assigneeId: "assigneeName",
  reporterId: "reporterName",
  projectId: "projectName",
  moduleId: "moduleName",
  ownerId: "ownerName",
  managerId: "managerName",
  createdBy: "createdByName",
  createdById: "createdByName",
  approvedBy: "approvedByName",
  approvedById: "approvedByName",
  reportsToId: "reportsToName",
  categoryId: "categoryName",
  authorId: "authorName",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  urgency: "Urgency",
  priority: "Priority",
  impact: "Impact",
  category: "Category",
  subcategory: "Subcategory",
  title: "Title",
  name: "Name",
  role: "Role",
  email: "Email",
  type: "Type",
  knownError: "Known error",
  slaBreached: "SLA breached",
  isActive: "Active",
  catalogId: "Catalog",
  catalogName: "Catalog",
  requesterId: "Requester",
  requesterName: "Requester",
  approverId: "Approver",
  approverName: "Approver",
  assignedTo: "Assignee",
  assigneeId: "Assignee",
  assigneeName: "Assignee",
  reporterId: "Reporter",
  reporterName: "Reporter",
  projectId: "Project",
  projectName: "Project",
  moduleId: "Module",
  moduleName: "Module",
  ownerId: "Owner",
  ownerName: "Owner",
  managerId: "Manager",
  managerName: "Manager",
  createdBy: "Created by",
  createdById: "Created by",
  createdByName: "Created by",
  approvedBy: "Approver",
  approvedById: "Approver",
  approvedByName: "Approver",
  reportsToId: "Reports to",
  reportsToName: "Reports to",
  categoryId: "Category",
  categoryName: "Category",
  authorId: "Author",
  authorName: "Author",
  referenceCode: "Reference",
  serialNumber: "Serial number",
  location: "Location",
  assetTag: "Asset tag",
};

function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // catalogName → Catalog Name style fallback
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a scalar for display. Prefer companion *Name values from the same
 * side of the diff when the raw value is a UUID. Returns null to omit the line.
 */
function displayScalar(
  key: string,
  value: string | number | boolean | null,
  sideBag: Record<string, unknown> | null,
): string | null {
  if (value === null) return "none";
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (isUuid(value)) {
    const nameKey = ID_TO_NAME_FIELD[key];
    if (nameKey && sideBag) {
      const named = sideBag[nameKey];
      if (typeof named === "string" && named.trim() && !isUuid(named)) {
        return named.trim();
      }
    }
    // Never show raw UUIDs in the Admin activity trail.
    return null;
  }
  return value;
}

type DiffPair = { before: string | number | boolean | null; after: string | number | boolean | null };

function collectPairs(record: Record<string, unknown>): Map<string, DiffPair> {
  const pairs = new Map<string, DiffPair>();

  const request =
    record.request && typeof record.request === "object" && !Array.isArray(record.request)
      ? (record.request as Record<string, unknown>)
      : null;
  const response =
    record.response &&
    typeof record.response === "object" &&
    !Array.isArray(record.response)
      ? (record.response as Record<string, unknown>)
      : null;

  if (request && response) {
    const keys = new Set([...Object.keys(request), ...Object.keys(response)]);
    for (const key of keys) {
      if (key === "password" || key === "token" || key === "refreshToken") continue;
      const before = request[key];
      const after = response[key];
      if (before === undefined || after === undefined) continue;
      if (!isScalar(before) || !isScalar(after)) continue;
      if (String(before) === String(after)) continue;
      pairs.set(key, { before, after });
    }
    return pairs;
  }

  for (const [key, value] of Object.entries(record)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "before" in value &&
      "after" in value
    ) {
      const pair = value as { before: unknown; after: unknown };
      if (!isScalar(pair.before) || !isScalar(pair.after)) continue;
      if (String(pair.before) === String(pair.after)) continue;
      pairs.set(key, { before: pair.before, after: pair.after });
    }
  }
  return pairs;
}

/** One line per changed key: `Status: Submitted → Approved`. Null/undefined → []. */
export function formatAuditDiff(diff: unknown): string[] {
  if (diff == null) return [];
  if (typeof diff !== "object" || Array.isArray(diff)) return [];

  const record = diff as Record<string, unknown>;

  if (record.outcome === "failed" || record.truncated === true) {
    return [];
  }

  const pairs = collectPairs(record);
  if (pairs.size === 0) return [];

  // Prefer *Name companions when both Id and Name changed in the same diff.
  const skipKeys = new Set<string>();
  for (const [idKey, nameKey] of Object.entries(ID_TO_NAME_FIELD)) {
    if (pairs.has(idKey) && pairs.has(nameKey)) {
      skipKeys.add(idKey);
    }
  }

  const beforeBag: Record<string, unknown> = {};
  const afterBag: Record<string, unknown> = {};
  for (const [key, pair] of pairs) {
    beforeBag[key] = pair.before;
    afterBag[key] = pair.after;
  }

  const lines: string[] = [];
  for (const key of [...pairs.keys()].sort()) {
    if (skipKeys.has(key)) continue;
    if (key === "password" || key === "token" || key === "refreshToken") continue;

    const pair = pairs.get(key)!;
    const beforeText = displayScalar(key, pair.before, beforeBag);
    const afterText = displayScalar(key, pair.after, afterBag);

    // Unresolved UUID on either side → omit the line (never show raw ids).
    if (beforeText === null || afterText === null) continue;
    if (beforeText === afterText) continue;

    lines.push(`${fieldLabel(key)}: ${beforeText} → ${afterText}`);
  }
  return lines;
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** @deprecated use formatAuditSummary */
export function formatAuditActivity(entry: AuditLog): string {
  return formatAuditSummary(entry);
}
