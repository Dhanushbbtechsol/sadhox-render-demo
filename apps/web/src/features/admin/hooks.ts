import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";

import { mockAdminStats, mockAssets, mockAuditLogs } from "./mocks";
import type {
  AdminStats,
  Asset,
  AssetListResponse,
  AssetStatus,
  AssetType,
  AuditLog,
  CountBucket,
  CreateAssetInput,
  KpiMetric,
  UpdateAssetInput,
} from "./types";

function loadMock<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), 250);
  });
}

function useOfflineAdminData() {
  return import.meta.env.DEV && isMockAccessToken(getAccessToken());
}

export type AssetFilters = {
  search?: string;
  type?: AssetType | "all";
  status?: AssetStatus | "all";
};

function filterMockAssets(filters: AssetFilters) {
  const needle = filters.search?.trim().toLowerCase() ?? "";
  return mockAssets.filter((asset) => {
    const matchesQuery =
      needle.length === 0 ||
      asset.assetTag.toLowerCase().includes(needle) ||
      asset.name.toLowerCase().includes(needle);
    const matchesType = !filters.type || filters.type === "all" || asset.type === filters.type;
    const matchesStatus =
      !filters.status || filters.status === "all" || asset.status === filters.status;
    return matchesQuery && matchesType && matchesStatus;
  });
}

export function useAssets(filters: AssetFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  params.set("page", "1");
  params.set("pageSize", "100");
  const query = params.toString();

  return useQuery({
    queryKey: ["assets", filters, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async () => {
      if (useOfflineAdminData()) {
        return filterMockAssets(filters);
      }
      try {
        const result = await apiFetch<AssetListResponse>(`/assets?${query}`);
        return result.data.map(normalizeAsset);
      } catch (error) {
        if (import.meta.env.DEV) return filterMockAssets(filters);
        throw error;
      }
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      if (useOfflineAdminData()) {
        const created: Asset = {
          id: `ast-${Date.now()}`,
          assetTag: input.assetTag,
          name: input.name,
          type: input.type,
          status: input.status ?? "Active",
          ownerId: input.ownerId ?? null,
          ownerName: null,
          linkedTicketId: null,
          linkedTicketCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockAssets.unshift(created);
        return created;
      }
      return apiFetch<Asset>("/assets", { method: "POST", body: input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAssetInput }) => {
      if (useOfflineAdminData()) {
        const index = mockAssets.findIndex((asset) => asset.id === id);
        if (index < 0) throw new Error("Asset not found");
        mockAssets[index] = {
          ...mockAssets[index],
          ...input,
          updatedAt: new Date().toISOString(),
        };
        return mockAssets[index];
      }
      return apiFetch<Asset>(`/assets/${id}`, { method: "PATCH", body: input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRetireAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (useOfflineAdminData()) {
        const index = mockAssets.findIndex((asset) => asset.id === id);
        if (index < 0) throw new Error("Asset not found");
        mockAssets[index] = {
          ...mockAssets[index],
          status: "Retired",
          updatedAt: new Date().toISOString(),
        };
        return mockAssets[index];
      }
      return apiFetch<Asset>(`/assets/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats", useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<AdminStats> => {
      if (useOfflineAdminData()) {
        return mockAdminStats;
      }
      try {
        const [stats, breakdown, sla] = await Promise.all([
          apiFetch<{ kpis: KpiMetric[] }>("/admin/dashboard/stats"),
          apiFetch<{
            ticketsByStatus: CountBucket[];
            ticketsByPriority: CountBucket[];
            ticketsByModule: CountBucket[];
          }>("/admin/dashboard/tickets-by-status"),
          apiFetch<{ data: { weekStart: string; met: number; breached: number }[] }>(
            "/admin/dashboard/sla-performance",
          ),
        ]);

        return {
          kpis: stats.kpis,
          ticketsByStatus: breakdown.ticketsByStatus,
          ticketsByPriority: breakdown.ticketsByPriority,
          ticketsByModule: breakdown.ticketsByModule,
          slaPerformance: sla.data.map((row) => ({
            ...row,
            label: formatWeekLabel(row.weekStart),
          })),
        };
      } catch (error) {
        if (import.meta.env.DEV) return mockAdminStats;
        throw error;
      }
    },
  });
}

function formatWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return weekStart;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useAuditLogs() {
  return useQuery<AuditLog[]>({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => loadMock(mockAuditLogs),
  });
}

function normalizeAsset(asset: Asset): Asset {
  return {
    ...asset,
    createdAt: String(asset.createdAt),
    updatedAt: String(asset.updatedAt),
  };
}
