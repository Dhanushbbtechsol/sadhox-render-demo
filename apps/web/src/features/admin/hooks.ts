import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";

import {
  mockAdminStats,
  mockAssets,
  mockAuditLogs,
  mockKnowledgeArticles,
  mockKnowledgeCategories,
  mockQueueHealth,
  mockSlaCompliance,
  mockSlaRules,
  mockStatusDistribution,
  mockVolumeByModule,
} from "./mocks";
import type {
  AdminStats,
  Asset,
  AssetListResponse,
  AssetStatus,
  AssetType,
  AuditLogListResponse,
  ChartRange,
  CountBucket,
  CreateAssetInput,
  CreateKnowledgeArticleInput,
  CreateKnowledgeCategoryInput,
  KnowledgeArticle,
  KnowledgeArticleStatus,
  KnowledgeCategory,
  KpiMetric,
  LinkedAssetPublic,
  QueueHealthResponse,
  SlaComplianceResponse,
  SlaRule,
  StatusDistributionResponse,
  UpdateAssetInput,
  UpdateKnowledgeArticleInput,
  UpdateKnowledgeCategoryInput,
  UpdateSlaRuleInput,
  VolumeByModuleResponse,
} from "./types";

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
          purchaseCost: input.purchaseCost ?? null,
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

export function useLinkAssetTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assetId,
      ticketId,
      ticketType,
    }: {
      assetId: string;
      ticketId: string;
      ticketType: "incident" | "service_request";
    }) => {
      if (useOfflineAdminData()) {
        const index = mockAssets.findIndex((asset) => asset.id === assetId);
        if (index < 0) throw new Error("Asset not found");
        mockAssets[index] = {
          ...mockAssets[index],
          linkedTicketId: ticketId,
          linkedTicketCount: 1,
          updatedAt: new Date().toISOString(),
        };
        return mockAssets[index];
      }
      return apiFetch<Asset>(`/assets/${assetId}/link-ticket`, {
        method: "POST",
        body: { ticketId, ticketType },
      });
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await queryClient.invalidateQueries({
        queryKey: ["incidents", vars.ticketId, "linked-assets"],
      });
    },
  });
}

export function useUnlinkAssetTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      if (useOfflineAdminData()) {
        const index = mockAssets.findIndex((asset) => asset.id === assetId);
        if (index < 0) throw new Error("Asset not found");
        const previousTicket = mockAssets[index].linkedTicketId;
        mockAssets[index] = {
          ...mockAssets[index],
          linkedTicketId: null,
          linkedTicketCount: 0,
          updatedAt: new Date().toISOString(),
        };
        return { asset: mockAssets[index], previousTicket };
      }
      const asset = await apiFetch<Asset>(`/assets/${assetId}/unlink-ticket`, {
        method: "DELETE",
      });
      return { asset, previousTicket: null as string | null };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      if (result.previousTicket) {
        await queryClient.invalidateQueries({
          queryKey: ["incidents", result.previousTicket, "linked-assets"],
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      }
    },
  });
}

export function useIncidentLinkedAssets(incidentId: string | undefined) {
  return useQuery({
    queryKey: ["incidents", incidentId, "linked-assets"],
    enabled: Boolean(incidentId),
    queryFn: async (): Promise<LinkedAssetPublic[]> => {
      if (!incidentId) return [];
      if (useOfflineAdminData()) {
        return mockAssets
          .filter((a) => a.linkedTicketId === incidentId)
          .map((a) => ({
            id: a.id,
            assetTag: a.assetTag,
            name: a.name,
            type: a.type,
            status: a.status,
            ownerName: a.ownerName,
            linkedTicketId: a.linkedTicketId,
          }));
      }
      return apiFetch<LinkedAssetPublic[]>(`/incidents/${incidentId}/linked-assets`);
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

export function useChartVolumeByModule(range: ChartRange) {
  return useQuery({
    queryKey: ["admin", "charts", "volume-by-module", range, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<VolumeByModuleResponse> => {
      if (useOfflineAdminData()) {
        return { ...mockVolumeByModule, range };
      }
      try {
        return await apiFetch<VolumeByModuleResponse>(
          `/admin/charts/volume-by-module?range=${range}`,
        );
      } catch (error) {
        if (import.meta.env.DEV) return { ...mockVolumeByModule, range };
        throw error;
      }
    },
  });
}

export function useChartStatusDistribution(range: ChartRange) {
  return useQuery({
    queryKey: ["admin", "charts", "status-distribution", range, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<StatusDistributionResponse> => {
      if (useOfflineAdminData()) {
        return { ...mockStatusDistribution, range };
      }
      try {
        return await apiFetch<StatusDistributionResponse>(
          `/admin/charts/status-distribution?range=${range}`,
        );
      } catch (error) {
        if (import.meta.env.DEV) return { ...mockStatusDistribution, range };
        throw error;
      }
    },
  });
}

export function useChartSlaCompliance(range: ChartRange) {
  return useQuery({
    queryKey: ["admin", "charts", "sla-compliance", range, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<SlaComplianceResponse> => {
      if (useOfflineAdminData()) {
        return { ...mockSlaCompliance, range };
      }
      try {
        return await apiFetch<SlaComplianceResponse>(
          `/admin/charts/sla-compliance?range=${range}`,
        );
      } catch (error) {
        if (import.meta.env.DEV) return { ...mockSlaCompliance, range };
        throw error;
      }
    },
  });
}

export type AuditLogFilters = {
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return useQuery({
    queryKey: ["admin", "audit-logs", filters, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<AuditLogListResponse> => {
      if (useOfflineAdminData()) {
        return {
          data: mockAuditLogs,
          page,
          limit,
          total: mockAuditLogs.length,
        };
      }
      try {
        return await apiFetch<AuditLogListResponse>(`/admin/audit-logs?${params}`);
      } catch (error) {
        if (import.meta.env.DEV) {
          return {
            data: mockAuditLogs,
            page,
            limit,
            total: mockAuditLogs.length,
          };
        }
        throw error;
      }
    },
  });
}

export function useQueueHealth() {
  return useQuery({
    queryKey: ["admin", "queues", useOfflineAdminData() ? "mock" : "live"],
    refetchInterval: 15_000,
    queryFn: async (): Promise<QueueHealthResponse> => {
      if (useOfflineAdminData()) {
        return mockQueueHealth;
      }
      try {
        return await apiFetch<QueueHealthResponse>("/admin/queues");
      } catch (error) {
        if (import.meta.env.DEV) return mockQueueHealth;
        throw error;
      }
    },
  });
}

function normalizeAsset(asset: Asset): Asset {
  return {
    ...asset,
    createdAt: String(asset.createdAt),
    updatedAt: String(asset.updatedAt),
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type KnowledgeArticleFilters = {
  q?: string;
  categoryId?: string | "all";
  status?: KnowledgeArticleStatus | "all";
};

function filterMockArticles(filters: KnowledgeArticleFilters) {
  const needle = filters.q?.trim().toLowerCase() ?? "";
  return mockKnowledgeArticles.filter((article) => {
    const matchesQuery =
      needle.length === 0 ||
      article.title.toLowerCase().includes(needle) ||
      article.slug.toLowerCase().includes(needle) ||
      article.body.toLowerCase().includes(needle);
    const matchesCategory =
      !filters.categoryId ||
      filters.categoryId === "all" ||
      article.categoryId === filters.categoryId;
    const matchesStatus =
      !filters.status || filters.status === "all" || article.status === filters.status;
    return matchesQuery && matchesCategory && matchesStatus;
  });
}

export function useKnowledgeCategories() {
  return useQuery({
    queryKey: ["knowledge", "categories", useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<KnowledgeCategory[]> => {
      if (useOfflineAdminData()) {
        return [...mockKnowledgeCategories];
      }
      try {
        return await apiFetch<KnowledgeCategory[]>("/knowledge/categories");
      } catch (error) {
        if (import.meta.env.DEV) return [...mockKnowledgeCategories];
        throw error;
      }
    },
  });
}

export function useCreateKnowledgeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKnowledgeCategoryInput) => {
      if (useOfflineAdminData()) {
        const created: KnowledgeCategory = {
          id: `kc-${Date.now()}`,
          name: input.name,
          slug: input.slug?.trim() || slugify(input.name),
          description: input.description ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockKnowledgeCategories.push(created);
        return created;
      }
      try {
        return await apiFetch<KnowledgeCategory>("/knowledge/categories", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          const created: KnowledgeCategory = {
            id: `kc-${Date.now()}`,
            name: input.name,
            slug: input.slug?.trim() || slugify(input.name),
            description: input.description ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockKnowledgeCategories.push(created);
          return created;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "categories"] });
    },
  });
}

export function useUpdateKnowledgeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateKnowledgeCategoryInput;
    }) => {
      if (useOfflineAdminData()) {
        const index = mockKnowledgeCategories.findIndex((c) => c.id === id);
        if (index < 0) throw new Error("Category not found");
        mockKnowledgeCategories[index] = {
          ...mockKnowledgeCategories[index],
          ...input,
          slug:
            input.slug?.trim() ||
            (input.name ? slugify(input.name) : mockKnowledgeCategories[index].slug),
          updatedAt: new Date().toISOString(),
        };
        return mockKnowledgeCategories[index];
      }
      try {
        return await apiFetch<KnowledgeCategory>(`/knowledge/categories/${id}`, {
          method: "PATCH",
          body: input,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          const index = mockKnowledgeCategories.findIndex((c) => c.id === id);
          if (index < 0) throw new Error("Category not found");
          mockKnowledgeCategories[index] = {
            ...mockKnowledgeCategories[index],
            ...input,
            updatedAt: new Date().toISOString(),
          };
          return mockKnowledgeCategories[index];
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "categories"] });
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "articles"] });
    },
  });
}

export function useDeleteKnowledgeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (useOfflineAdminData()) {
        const index = mockKnowledgeCategories.findIndex((c) => c.id === id);
        if (index < 0) throw new Error("Category not found");
        mockKnowledgeCategories.splice(index, 1);
        for (const article of mockKnowledgeArticles) {
          if (article.categoryId === id) article.categoryId = null;
        }
        return { id };
      }
      try {
        await apiFetch(`/knowledge/categories/${id}`, { method: "DELETE" });
        return { id };
      } catch (error) {
        if (import.meta.env.DEV) {
          const index = mockKnowledgeCategories.findIndex((c) => c.id === id);
          if (index < 0) throw new Error("Category not found");
          mockKnowledgeCategories.splice(index, 1);
          return { id };
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });
}

export function useKnowledgeArticles(filters: KnowledgeArticleFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.categoryId && filters.categoryId !== "all") {
    params.set("categoryId", filters.categoryId);
  }
  const query = params.toString();

  return useQuery({
    queryKey: ["knowledge", "articles", filters, useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<KnowledgeArticle[]> => {
      if (useOfflineAdminData()) {
        return filterMockArticles(filters);
      }
      try {
        const data = await apiFetch<KnowledgeArticle[]>(
          `/knowledge/articles${query ? `?${query}` : ""}`,
        );
        if (filters.status && filters.status !== "all") {
          return data.filter((a) => a.status === filters.status);
        }
        return data;
      } catch (error) {
        if (import.meta.env.DEV) return filterMockArticles(filters);
        throw error;
      }
    },
  });
}

export function useKnowledgeArticle(id: string | undefined) {
  return useQuery({
    queryKey: ["knowledge", "articles", id, useOfflineAdminData() ? "mock" : "live"],
    enabled: Boolean(id) && id !== "new",
    queryFn: async (): Promise<KnowledgeArticle> => {
      if (!id) throw new Error("Missing article id");
      if (useOfflineAdminData()) {
        const found = mockKnowledgeArticles.find((a) => a.id === id);
        if (!found) throw new Error("Article not found");
        return found;
      }
      try {
        return await apiFetch<KnowledgeArticle>(`/knowledge/articles/${id}`);
      } catch (error) {
        if (import.meta.env.DEV) {
          const found = mockKnowledgeArticles.find((a) => a.id === id);
          if (!found) throw new Error("Article not found");
          return found;
        }
        throw error;
      }
    },
  });
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateKnowledgeArticleInput) => {
      const payload = {
        ...input,
        slug: input.slug?.trim() || slugify(input.title),
        status: input.status ?? "Draft",
      };
      if (useOfflineAdminData()) {
        const created: KnowledgeArticle = {
          id: `ka-${Date.now()}`,
          title: payload.title,
          slug: payload.slug,
          body: payload.body,
          status: payload.status,
          categoryId: payload.categoryId ?? null,
          authorId: "admin-mock",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockKnowledgeArticles.unshift(created);
        return created;
      }
      try {
        return await apiFetch<KnowledgeArticle>("/knowledge/articles", {
          method: "POST",
          body: payload,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          const created: KnowledgeArticle = {
            id: `ka-${Date.now()}`,
            title: payload.title,
            slug: payload.slug,
            body: payload.body,
            status: payload.status,
            categoryId: payload.categoryId ?? null,
            authorId: "admin-mock",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockKnowledgeArticles.unshift(created);
          return created;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "articles"] });
    },
  });
}

export function useUpdateKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateKnowledgeArticleInput;
    }) => {
      if (useOfflineAdminData()) {
        const index = mockKnowledgeArticles.findIndex((a) => a.id === id);
        if (index < 0) throw new Error("Article not found");
        mockKnowledgeArticles[index] = {
          ...mockKnowledgeArticles[index],
          ...input,
          slug:
            input.slug?.trim() ||
            (input.title ? slugify(input.title) : mockKnowledgeArticles[index].slug),
          updatedAt: new Date().toISOString(),
        };
        return mockKnowledgeArticles[index];
      }
      try {
        return await apiFetch<KnowledgeArticle>(`/knowledge/articles/${id}`, {
          method: "PATCH",
          body: input,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          const index = mockKnowledgeArticles.findIndex((a) => a.id === id);
          if (index < 0) throw new Error("Article not found");
          mockKnowledgeArticles[index] = {
            ...mockKnowledgeArticles[index],
            ...input,
            updatedAt: new Date().toISOString(),
          };
          return mockKnowledgeArticles[index];
        }
        throw error;
      }
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "articles"] });
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "articles", vars.id] });
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (useOfflineAdminData()) {
        const index = mockKnowledgeArticles.findIndex((a) => a.id === id);
        if (index < 0) throw new Error("Article not found");
        mockKnowledgeArticles.splice(index, 1);
        return { id };
      }
      try {
        await apiFetch(`/knowledge/articles/${id}`, { method: "DELETE" });
        return { id };
      } catch (error) {
        if (import.meta.env.DEV) {
          const index = mockKnowledgeArticles.findIndex((a) => a.id === id);
          if (index < 0) throw new Error("Article not found");
          mockKnowledgeArticles.splice(index, 1);
          return { id };
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["knowledge", "articles"] });
    },
  });
}

export function useSlaRules() {
  return useQuery({
    queryKey: ["admin", "sla-rules", useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<SlaRule[]> => {
      if (useOfflineAdminData()) {
        return [...mockSlaRules].sort((a, b) => a.priority.localeCompare(b.priority));
      }
      try {
        const data = await apiFetch<SlaRule[]>("/admin/sla-rules");
        return [...data].sort((a, b) => a.priority.localeCompare(b.priority));
      } catch (error) {
        if (import.meta.env.DEV) {
          return [...mockSlaRules].sort((a, b) => a.priority.localeCompare(b.priority));
        }
        throw error;
      }
    },
  });
}

export function useUpdateSlaRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSlaRuleInput) => {
      if (useOfflineAdminData()) {
        const index = mockSlaRules.findIndex((r) => r.priority === input.priority);
        if (index < 0) throw new Error("SLA rule not found");
        mockSlaRules[index] = {
          ...mockSlaRules[index],
          responseMinutes: input.responseMinutes,
          resolveMinutes: input.resolveMinutes,
        };
        return mockSlaRules[index];
      }
      try {
        return await apiFetch<SlaRule>(`/admin/sla-rules/${input.priority}`, {
          method: "PATCH",
          body: {
            responseMinutes: input.responseMinutes,
            resolveMinutes: input.resolveMinutes,
          },
        });
      } catch (error) {
        // Fallback: some contracts use body-only PATCH without priority in path
        try {
          return await apiFetch<SlaRule>("/admin/sla-rules", {
            method: "PATCH",
            body: input,
          });
        } catch (inner) {
          if (import.meta.env.DEV) {
            const index = mockSlaRules.findIndex((r) => r.priority === input.priority);
            if (index < 0) throw new Error("SLA rule not found");
            mockSlaRules[index] = {
              ...mockSlaRules[index],
              responseMinutes: input.responseMinutes,
              resolveMinutes: input.resolveMinutes,
            };
            return mockSlaRules[index];
          }
          throw inner instanceof Error ? inner : error;
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sla-rules"] });
    },
  });
}

export function slugifyTitle(title: string) {
  return slugify(title);
}
