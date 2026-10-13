export type Role = "Admin" | "Agent" | "EndUser" | "Manager";

export type AssetType = "Hardware" | "Software";

export type AssetStatus = "Active" | "InRepair" | "Retired";

export type Asset = {
  id: string;
  referenceCode?: string | null;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string | null;
  ownerName: string | null;
  serialNumber?: string | null;
  location?: string | null;
  assignedAt?: string | null;
  linkedTicketId: string | null;
  linkedTicketCount: number;
  /** Admin-only financial field. */
  purchaseCost?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetAssignment = {
  id: string;
  assetId: string;
  fromOwnerId: string | null;
  fromOwnerName: string | null;
  toOwnerId: string | null;
  toOwnerName: string | null;
  assignedBy: string | null;
  assignedByName: string | null;
  note: string | null;
  createdAt: string;
};

export type AssetListResponse = {
  data: Asset[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateAssetInput = {
  assetTag: string;
  name: string;
  type: AssetType;
  status?: AssetStatus;
  ownerId?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  purchaseCost?: string;
};

export type UpdateAssetInput = Partial<CreateAssetInput> & {
  ownerId?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  purchaseCost?: string | null;
};

export type LinkedAssetPublic = {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerName: string | null;
  linkedTicketId: string | null;
};


export type TrendDirection = "up" | "down" | "flat";

export type KpiMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: TrendDirection;
};

export type CountBucket = {
  label: string;
  count: number;
};

export type AdminStats = {
  kpis: KpiMetric[];
  ticketsByStatus: CountBucket[];
  ticketsByPriority: CountBucket[];
  ticketsByModule: CountBucket[];
  slaPerformance: SlaWeekBucket[];
};

export type SlaWeekBucket = {
  weekStart: string;
  met: number;
  breached: number;
  label: string;
};

export type ChartRange = "7d" | "30d" | "quarter" | "ytd" | "year";

export type VolumeByModuleRow = {
  module: string;
  open: number;
  closed: number;
  total: number;
};

export type VolumeByModuleResponse = {
  range: ChartRange;
  from: string;
  to: string;
  data: VolumeByModuleRow[];
};

export type StatusDistributionRow = {
  status: string;
  module: string;
  label: string;
  count: number;
};

export type StatusDistributionResponse = {
  range: ChartRange;
  from: string;
  to: string;
  data: StatusDistributionRow[];
};

export type SlaComplianceResponse = {
  range: ChartRange;
  from: string;
  to: string;
  met: number;
  breached: number;
  rate: number;
};

export type AuditLog = {
  id: string;
  actorId?: string | null;
  actor: string;
  /** Actor role when joined from users (null for system / unknown). */
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diff?: unknown;
  createdAt: string;
};

export type AuditLogListResponse = {
  data: AuditLog[];
  page: number;
  limit: number;
  total: number;
};

export type QueueCounts = {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  stalled: number;
};

export type QueueLastFailure = {
  jobName: string;
  reason: string;
  failedAt: string;
};

export type QueueHealthRow = {
  name: string;
  /** Everyday title; falls back to `name` on older APIs. */
  title?: string;
  purpose?: string;
  counts: QueueCounts;
  paused: boolean;
  alert: boolean;
  error: string | null;
  lastFailure?: QueueLastFailure | null;
};

export type QueueHealthResponse = {
  queues: QueueHealthRow[];
  alert: boolean;
};

/** Dev D Phase 5 Knowledge contract */
export type KnowledgeArticleStatus = "Draft" | "Published";

export type KnowledgeCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: KnowledgeArticleStatus;
  categoryId: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKnowledgeCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
};

export type UpdateKnowledgeCategoryInput = Partial<CreateKnowledgeCategoryInput>;

export type CreateKnowledgeArticleInput = {
  title: string;
  slug?: string;
  body: string;
  status?: KnowledgeArticleStatus;
  categoryId?: string | null;
};

export type UpdateKnowledgeArticleInput = Partial<CreateKnowledgeArticleInput>;

export type TicketPriority = "P1" | "P2" | "P3" | "P4";

/** Dev D Phase 5 Admin SLA rules contract */
export type SlaRule = {
  id: string;
  priority: TicketPriority;
  responseMinutes: number;
  resolveMinutes: number;
  createdAt: string;
};

export type UpdateSlaRuleInput = {
  priority: TicketPriority;
  responseMinutes: number;
  resolveMinutes: number;
};

export type EscalationRule = {
  priority: TicketPriority;
  notifyManager: boolean;
  notifyAdmin: boolean;
};

export type UpdateEscalationRuleInput = {
  priority: TicketPriority;
  notifyManager: boolean;
  notifyAdmin: boolean;
};

export type DeskReport = {
  title: string;
  generatedAt: string;
  range: ChartRange;
  scope: "All" | "Team";
  kpis: {
    incidentsOpen: number;
    incidentsResolved: number;
    serviceRequestsOpen: number;
    serviceRequestsApproved: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  sla: {
    met: number;
    breached: number;
    rate: number;
  };
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};
