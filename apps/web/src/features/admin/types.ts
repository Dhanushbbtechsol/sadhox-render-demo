export type Role = "Admin" | "Agent" | "EndUser";

export type AssetCategory = "Hardware" | "Software" | "Network";

export type AssetStatus = "Procured" | "Active" | "Under Maintenance" | "Retired";

export type Asset = {
  id: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  ownerName: string;
  status: AssetStatus;
  linkedTicketCount: number;
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
};

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};
