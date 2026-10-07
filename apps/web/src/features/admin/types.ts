export type Role = "Admin" | "Agent" | "EndUser" | "Manager";

export type AssetType = "Hardware" | "Software";

export type AssetStatus = "Active" | "InRepair" | "Retired";

export type Asset = {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownerId: string | null;
  ownerName: string | null;
  linkedTicketId: string | null;
  linkedTicketCount: number;
  /** Admin-only financial field. */
  purchaseCost?: string | null;
  createdAt: string;
  updatedAt: string;
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
  ownerId?: string;
  purchaseCost?: string;
};

export type UpdateAssetInput = Partial<CreateAssetInput> & {
  ownerId?: string | null;
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

export type ChartRange = "7d" | "30d" | "ytd";

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

export type QueueHealthRow = {
  name: string;
  counts: QueueCounts;
  paused: boolean;
  alert: boolean;
  error: string | null;
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
