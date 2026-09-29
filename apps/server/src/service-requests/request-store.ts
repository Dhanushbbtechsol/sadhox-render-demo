import { randomUUID } from "crypto";
import { CATALOG_ITEMS } from "../service-catalog/catalog.items";
import type { CatalogFormField, CatalogRole } from "../service-catalog/catalog.types";

const ROLES: readonly CatalogRole[] = ["Admin", "Agent", "EndUser"];
const RESERVED_FIELDS = new Set(["justification", "urgency"]);
const URGENCIES = new Set(["Low", "Medium", "High"]);

export type StoreUser = {
  id: string;
  name: string;
  role: string;
};

export type ServiceRequestView = {
  id: string;
  catalogId: string;
  catalogName: string;
  requesterId: string;
  requesterName: string;
  status: "Submitted";
  justification: string;
  urgency: "Low" | "Medium" | "High";
  fields: Record<string, string>;
  createdAt: string;
};

export type StoreFailure = {
  status: 400 | 403 | 404;
  message: string;
};

type StoredRequest = ServiceRequestView;

const requests: StoredRequest[] = [];

export function resetServiceRequests() {
  requests.splice(0, requests.length);
}

export function isKnownRole(role: string): role is CatalogRole {
  return ROLES.includes(role as CatalogRole);
}

export function canRequestCatalogItem(role: CatalogRole, allowedRoles: readonly string[]) {
  return allowedRoles.includes(role);
}

export function canViewServiceRequest(role: CatalogRole, userId: string, requesterId: string) {
  if (role === "Admin" || role === "Agent") return true;
  return requesterId === userId;
}

export function normalizeRequestFields(
  formFields: CatalogFormField[],
  fields: Record<string, unknown>,
): { ok: true; fields: Record<string, string> } | { ok: false; message: string } {
  const specs = formFields.filter((field) => !RESERVED_FIELDS.has(field.name));
  const byName = new Map(specs.map((field) => [field.name, field]));
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    const spec = byName.get(key);
    if (!spec) return { ok: false, message: `Unknown field: ${key}` };
    if (typeof value !== "string") return { ok: false, message: `Invalid field: ${key}` };
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 2000) return { ok: false, message: `Invalid field: ${key}` };
    if (spec.type === "select" && !spec.options?.includes(trimmed)) {
      return { ok: false, message: `Invalid option for ${spec.label}` };
    }
    normalized[key] = trimmed;
  }

  for (const spec of specs) {
    if (spec.required !== false && !normalized[spec.name]) {
      return { ok: false, message: `${spec.label} is required` };
    }
  }

  return { ok: true, fields: normalized };
}

function denyRole(role: string): StoreFailure | CatalogRole {
  if (!isKnownRole(role)) return { status: 403, message: "Insufficient role" };
  return role;
}

export function listCatalogForUser(user: StoreUser) {
  const role = denyRole(user.role);
  if (typeof role !== "string") return { ok: false as const, error: role };

  return {
    ok: true as const,
    data: CATALOG_ITEMS.filter((item) => canRequestCatalogItem(role, item.allowedRoles)).map(
      (item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        department: item.department,
        formFields: item.formFields,
      }),
    ),
  };
}

export function listServiceRequestsForUser(user: StoreUser) {
  const role = denyRole(user.role);
  if (typeof role !== "string") return { ok: false as const, error: role };

  const visible = requests.filter((request) =>
    canViewServiceRequest(role, user.id, request.requesterId),
  );
  return { ok: true as const, data: visible };
}

export function getServiceRequestForUser(user: StoreUser, id: string) {
  const role = denyRole(user.role);
  if (typeof role !== "string") return { ok: false as const, error: role };

  const request = requests.find((entry) => entry.id === id);
  if (!request || !canViewServiceRequest(role, user.id, request.requesterId)) {
    return { ok: false as const, error: { status: 404 as const, message: "Service request not found" } };
  }
  return { ok: true as const, data: request };
}

export function createServiceRequest(
  user: StoreUser,
  input: {
    catalogId: string;
    justification: string;
    urgency: string;
    fields: Record<string, unknown>;
  },
) {
  const role = denyRole(user.role);
  if (typeof role !== "string") return { ok: false as const, error: role };

  const justification = input.justification?.trim() ?? "";
  if (!justification || justification.length > 4000) {
    return { ok: false as const, error: { status: 400 as const, message: "Justification is required" } };
  }
  if (!URGENCIES.has(input.urgency)) {
    return { ok: false as const, error: { status: 400 as const, message: "Invalid urgency" } };
  }
  if (!input.fields || typeof input.fields !== "object" || Array.isArray(input.fields)) {
    return { ok: false as const, error: { status: 400 as const, message: "Invalid fields" } };
  }

  const item = CATALOG_ITEMS.find((entry) => entry.id === input.catalogId);
  if (!item) {
    return { ok: false as const, error: { status: 404 as const, message: "Catalog item not found" } };
  }
  if (!canRequestCatalogItem(role, item.allowedRoles)) {
    return {
      ok: false as const,
      error: { status: 403 as const, message: "You are not allowed to request this catalog item" },
    };
  }

  const normalized = normalizeRequestFields(item.formFields, input.fields);
  if (!normalized.ok) {
    return { ok: false as const, error: { status: 400 as const, message: normalized.message } };
  }

  const request: StoredRequest = {
    id: randomUUID(),
    catalogId: item.id,
    catalogName: item.name,
    requesterId: user.id,
    requesterName: user.name,
    status: "Submitted",
    justification,
    urgency: input.urgency as StoredRequest["urgency"],
    fields: normalized.fields,
    createdAt: new Date().toISOString(),
  };
  requests.unshift(request);
  return { ok: true as const, data: request };
}
