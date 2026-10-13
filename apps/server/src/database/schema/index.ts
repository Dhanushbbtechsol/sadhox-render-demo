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
  numeric,
  index,
  primaryKey,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "Admin",
  "Agent",
  "EndUser",
  "Manager",
]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "New",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
  "Reopened",
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
/** Knowledge Base article lifecycle (Phase 5). */
export const knowledgeArticleStatusEnum = pgEnum("knowledge_article_status", [
  "Draft",
  "Published",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("EndUser"),
    name: varchar("name", { length: 255 }).notNull(),
    /** Phase 9 org chart — Manager or Admin this user reports to. */
    reportsToId: uuid("reports_to_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_reports_to_id_idx").on(t.reportsToId),
  ],
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

/** Phase 6 — project owned by a Manager (projects.manager_id). */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("projects_manager_id_idx").on(t.managerId)],
);

/**
 * Phase 6 — Agents who work tickets on a project.
 * Service rejects non-Agent inserts (Managers supervise; Admins are global).
 */
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      columns: [t.projectId, t.userId],
      name: "project_members_pk",
    }),
    index("project_members_user_id_idx").on(t.userId),
  ],
);

/** Phase 6 — modules within a project (tickets may reference both). */
export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (t) => [index("modules_project_id_idx").on(t.projectId)],
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

export const referenceCounters = pgTable("reference_counters", {
  prefix: varchar("prefix", { length: 8 }).primaryKey(),
  value: integer("value").notNull(),
});

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 64 }).notNull().default("Other"),
    subcategory: varchar("subcategory", { length: 128 })
      .notNull()
      .default("Other"),
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
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    slaBreached: boolean("sla_breached").notNull().default(false),
    /** Phase 9 — SLA warning (75%) mailed once before breach. */
    slaWarned: boolean("sla_warned").notNull().default(false),
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
    index("incidents_project_id_idx").on(t.projectId),
  ],
);

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    rootCause: text("root_cause"),
    knownError: boolean("known_error").notNull().default(false),
    status: problemStatusEnum("status").notNull().default("Open"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("problems_status_idx").on(t.status),
    index("problems_project_id_idx").on(t.projectId),
  ],
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

/** Admin-managed ticket category taxonomy (client follow-on). */
export const incidentCategories = pgTable(
  "incident_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("incident_categories_active_idx").on(t.isActive)],
);

export const incidentSubcategories = pgTable(
  "incident_subcategories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => incidentCategories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    /** Minimum priority floor — drives Response time via existing P1–P4 SLA rules. */
    minPriority: priorityEnum("min_priority"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("incident_subcategories_category_name_unique").on(
      t.categoryId,
      t.name,
    ),
    index("incident_subcategories_category_id_idx").on(t.categoryId),
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
    /** Optional grouping under department (Phase 7). Nullable for older rows. */
    subcategory: varchar("subcategory", { length: 128 }),
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
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
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
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    fulfillmentNotes: text("fulfillment_notes"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
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
    index("service_requests_project_id_idx").on(t.projectId),
  ],
);

export const changes = pgTable(
  "changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
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
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    moduleId: uuid("module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
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
    index("changes_project_id_idx").on(t.projectId),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),
    assetTag: varchar("asset_tag", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    type: assetTypeEnum("type").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: assetStatusEnum("status").notNull().default("Active"),
    /** Admin-only financial value; never expose on Agent-facing linked-asset reads. */
    purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }),
    /** Polymorphic ticket UUID (incident or service_request); no FK. */
    linkedTicketId: uuid("linked_ticket_id"),
    serialNumber: varchar("serial_number", { length: 128 }),
    location: varchar("location", { length: 128 }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("assets_owner_id_idx").on(t.ownerId),
    index("assets_status_idx").on(t.status),
    index("assets_linked_ticket_id_idx").on(t.linkedTicketId),
  ],
);

/** Phase 9 — assignment history when asset owner changes. */
export const assetAssignments = pgTable(
  "asset_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    fromOwnerId: uuid("from_owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    toOwnerId: uuid("to_owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("asset_assignments_asset_id_idx").on(t.assetId)],
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

/** Phase 9 — who to notify on SLA warning/breach per priority. */
export const escalationRules = pgTable("escalation_rules", {
  priority: priorityEnum("priority").primaryKey(),
  notifyManager: boolean("notify_manager").notNull().default(true),
  notifyAdmin: boolean("notify_admin").notNull().default(false),
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
    href: varchar("href", { length: 512 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_id_idx").on(t.userId)],
);

export const knowledgeCategories = pgTable(
  "knowledge_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("knowledge_categories_slug_idx").on(t.slug)],
);

export const knowledgeArticles = pgTable(
  "knowledge_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    body: text("body").notNull(),
    status: knowledgeArticleStatusEnum("status").notNull().default("Draft"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => knowledgeCategories.id, { onDelete: "restrict" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("knowledge_articles_category_id_idx").on(t.categoryId),
    index("knowledge_articles_status_idx").on(t.status),
    index("knowledge_articles_slug_idx").on(t.slug),
  ],
);

/** Polymorphic ticket Γåö Published KB article links (incident | problem | service_request). */
export const ticketKnowledgeLinks = pgTable(
  "ticket_knowledge_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull(),
    ticketType: ticketTypeEnum("ticket_type").notNull(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeArticles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("ticket_knowledge_links_unique").on(
      t.ticketId,
      t.ticketType,
      t.articleId,
    ),
    index("ticket_knowledge_links_ticket_idx").on(t.ticketType, t.ticketId),
    index("ticket_knowledge_links_article_id_idx").on(t.articleId),
  ],
);

/** GUESS: response/resolve minute thresholds per priority ΓÇö FRD only says "SLA threshold definitions per priority level". */
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
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type KnowledgeArticleStatus =
  (typeof knowledgeArticleStatusEnum.enumValues)[number];
export type TicketKnowledgeLink = typeof ticketKnowledgeLinks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectModule = typeof modules.$inferSelect;
