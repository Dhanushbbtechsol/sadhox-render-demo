import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["Admin", "Agent", "EndUser"]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "New",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
]);
export const priorityEnum = pgEnum("priority_level", ["P1", "P2", "P3", "P4"]);
export const impactUrgencyEnum = pgEnum("impact_urgency", [
  "High",
  "Medium",
  "Low",
]);
export const problemStatusEnum = pgEnum("problem_status", [
  "Open",
  "Investigating",
  "KnownError",
  "Resolved",
  "Closed",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "Draft",
  "Submitted",
  "PendingApproval",
  "Approved",
  "Rejected",
  "InFulfillment",
  "Fulfilled",
  "Closed",
]);
export const requestUrgencyEnum = pgEnum("request_urgency", [
  "Low",
  "Medium",
  "High",
]);
export const changeTypeEnum = pgEnum("change_type", [
  "Standard",
  "Normal",
  "Emergency",
]);
export const changeStatusEnum = pgEnum("change_status", [
  "Draft",
  "PendingApproval",
  "Submitted",
  "Approved",
  "Scheduled",
  "Implementing",
  "Implemented",
  "Completed",
  "Closed",
  "Failed",
  "RolledBack",
  "Cancelled",
]);
export const assetTypeEnum = pgEnum("asset_type", ["Hardware", "Software"]);
export const assetStatusEnum = pgEnum("asset_status", [
  "Active",
  "InRepair",
  "Retired",
]);
export const ticketTypeEnum = pgEnum("ticket_type", [
  "incident",
  "problem",
  "service_request",
  "change",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("EndUser"),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_token_hash_idx").on(t.tokenHash),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id"),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 64 }).notNull().default("Other"),
    priority: priorityEnum("priority").notNull().default("P3"),
    impact: impactUrgencyEnum("impact").notNull().default("Medium"),
    urgency: impactUrgencyEnum("urgency").notNull().default("Medium"),
    status: incidentStatusEnum("status").notNull().default("New"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    slaBreached: boolean("sla_breached").notNull().default(false),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("incidents_status_idx").on(t.status),
    index("incidents_assigned_to_idx").on(t.assignedTo),
    index("incidents_reporter_id_idx").on(t.reporterId),
  ],
);

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    rootCause: text("root_cause"),
    knownError: boolean("known_error").notNull().default(false),
    status: problemStatusEnum("status").notNull().default("Open"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("problems_status_idx").on(t.status)],
);

/** Links one Problem to many Incident records (root-cause grouping). */
export const problemIncidents = pgTable(
  "problem_incidents",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.problemId, t.incidentId] }),
    unique("problem_incidents_incident_unique").on(t.incidentId),
    index("problem_incidents_problem_id_idx").on(t.problemId),
  ],
);

export type CatalogFormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
};

export const serviceCatalog = pgTable(
  "service_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    department: varchar("department", { length: 128 }).notNull(),
    formFields: jsonb("form_fields")
      .$type<CatalogFormField[]>()
      .notNull()
      .default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("service_catalog_department_idx").on(t.department)],
);

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => serviceCatalog.id),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    approverId: uuid("approver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    justification: text("justification").notNull().default(""),
    urgency: requestUrgencyEnum("urgency").notNull().default("Medium"),
    fields: jsonb("fields")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    status: requestStatusEnum("status").notNull().default("Draft"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("service_requests_status_idx").on(t.status),
    index("service_requests_requester_id_idx").on(t.requesterId),
  ],
);

export const changes = pgTable(
  "changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: changeTypeEnum("type").notNull().default("Normal"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    rollbackPlan: text("rollback_plan"),
    status: changeStatusEnum("status").notNull().default("Draft"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("changes_status_idx").on(t.status),
    index("changes_type_idx").on(t.type),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetTag: varchar("asset_tag", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    type: assetTypeEnum("type").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: assetStatusEnum("status").notNull().default("Active"),
    /** Polymorphic ticket UUID (incident or service_request); no FK. */
    linkedTicketId: uuid("linked_ticket_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("assets_owner_id_idx").on(t.ownerId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull(),
    ticketType: ticketTypeEnum("ticket_type").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_ticket_idx").on(t.ticketType, t.ticketId)],
);

/** GUESS: response/resolve minute thresholds per priority — FRD only says "SLA threshold definitions per priority level". */
export const slaRules = pgTable("sla_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  priority: priorityEnum("priority").notNull().unique(),
  responseMinutes: integer("response_minutes").notNull(),
  resolveMinutes: integer("resolve_minutes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** GUESS: notification payload shape — FRD only says "User notification delivery records". */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_id_idx").on(t.userId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  reportedIncidents: many(incidents, { relationName: "incidentReporter" }),
  assignedIncidents: many(incidents, { relationName: "incidentAssignee" }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  reporter: one(users, {
    fields: [incidents.reporterId],
    references: [users.id],
    relationName: "incidentReporter",
  }),
  assignee: one(users, {
    fields: [incidents.assignedTo],
    references: [users.id],
    relationName: "incidentAssignee",
  }),
  problemLinks: many(problemIncidents),
}));

export const problemsRelations = relations(problems, ({ many }) => ({
  incidentLinks: many(problemIncidents),
}));

export const problemIncidentsRelations = relations(
  problemIncidents,
  ({ one }) => ({
    problem: one(problems, {
      fields: [problemIncidents.problemId],
      references: [problems.id],
    }),
    incident: one(incidents, {
      fields: [problemIncidents.incidentId],
      references: [incidents.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type Incident = typeof incidents.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Priority = (typeof priorityEnum.enumValues)[number];
export type ImpactUrgency = (typeof impactUrgencyEnum.enumValues)[number];
export type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];
export type ProblemStatus = (typeof problemStatusEnum.enumValues)[number];
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetType = (typeof assetTypeEnum.enumValues)[number];
export type AssetStatus = (typeof assetStatusEnum.enumValues)[number];
