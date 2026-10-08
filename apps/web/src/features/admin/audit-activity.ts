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
    return detail.text;
  }

  const failed = detail.failed ? " (failed)" : "";
  if (detail.targetName) {
    return `${who} ${detail.verb} ${detail.object} “${detail.targetName}”${failed}`;
  }
  return `${who} ${detail.verb} ${detail.object}${failed}`;
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
  "system.sla_breach": "System marked an SLA breach",
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
    object: "an incident",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/incidents\/:id$/,
    verb: "updated",
    object: "an incident",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/incidents\/:id\/assign$/,
    verb: "assigned",
    object: "an incident",
    nameKeys: ["title", "assignedTo"],
  },
  {
    re: /^POST \/incidents\/:id\/comments$/,
    verb: "commented on",
    object: "an incident",
    nameKeys: ["title"],
  },

  {
    re: /^POST \/problems$/,
    verb: "created",
    object: "a problem",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/problems\/:id$/,
    verb: "updated",
    object: "a problem",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/problems\/:id\/incidents\/:id$/,
    verb: "linked",
    object: "an incident to a problem",
  },

  {
    re: /^POST \/service-requests$/,
    verb: "created",
    object: "a service request",
    nameKeys: ["title", "name"],
  },
  {
    re: /^PATCH \/service-requests\/:id$/,
    verb: "updated",
    object: "a service request",
    nameKeys: ["title", "name"],
  },
  {
    re: /^POST \/service-requests\/:id\/approve$/,
    verb: "approved",
    object: "a service request",
  },
  {
    re: /^POST \/service-requests\/:id\/reject$/,
    verb: "rejected",
    object: "a service request",
  },
  {
    re: /^POST \/service-requests\/:id\/fulfill$/,
    verb: "fulfilled",
    object: "a service request",
  },

  {
    re: /^POST \/changes$/,
    verb: "created",
    object: "a change",
    nameKeys: ["title"],
  },
  {
    re: /^PATCH \/changes\/:id$/,
    verb: "updated",
    object: "a change",
    nameKeys: ["title"],
  },
  {
    re: /^POST \/changes\/:id\/approve$/,
    verb: "approved",
    object: "a change",
  },
  {
    re: /^POST \/changes\/:id\/reject$/,
    verb: "rejected",
    object: "a change",
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
    object: "an SLA rule",
    nameKeys: ["priority"],
  },
  {
    re: /^PATCH \/admin\/sla-rules\/:id$/,
    verb: "updated",
    object: "an SLA rule",
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
    incidents: "incident",
    problems: "problem",
    "service-requests": "service request",
    changes: "change",
    assets: "asset",
    "service-catalog": "catalog item",
    articles: "knowledge article",
    categories: "knowledge category",
    comments: "comment",
    "sla-rules": "SLA rule",
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

/** @deprecated use formatAuditSummary */
export function formatAuditActivity(entry: AuditLog): string {
  return formatAuditSummary(entry);
}
