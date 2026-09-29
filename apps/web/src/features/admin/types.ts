export type Role = "Admin" | "Agent" | "EndUser";

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
};

export type UpdateAssetInput = Partial<CreateAssetInput> & {
  ownerId?: string | null;
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

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};
