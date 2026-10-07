import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeLinkTicketType,
  TicketKnowledgeLink,
} from "@/types/knowledge";

const categoriesKey = ["knowledge", "categories"] as const;
const articlesKey = ["knowledge", "articles"] as const;
const linksKey = ["knowledge", "links"] as const;

function toQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useKnowledgeCategories() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...categoriesKey, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: KnowledgeCategory[] }>(
        "/knowledge/categories",
      );
      return result.data;
    },
  });
}

export function useKnowledgeArticles(params: {
  q?: string;
  categoryId?: string;
  enabled?: boolean;
  /** When true, skip fetch until categoryId is set (catalog related-help). */
  requireCategory?: boolean;
} = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  const { q, categoryId, enabled = true, requireCategory = false } = params;
  const waitingOnCategory = requireCategory && !categoryId;

  return useQuery({
    queryKey: [...articlesKey, userId, { q, categoryId }],
    enabled: Boolean(userId) && enabled && !waitingOnCategory,
    queryFn: async () => {
      const result = await apiFetch<{ data: KnowledgeArticle[] }>(
        `/knowledge/articles${toQuery({ q, categoryId })}`,
      );
      return result.data;
    },
  });
}

export function useKnowledgeArticle(idOrSlug: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...articlesKey, "detail", idOrSlug, userId],
    enabled: Boolean(idOrSlug) && Boolean(userId),
    queryFn: () =>
      apiFetch<KnowledgeArticle>(`/knowledge/articles/${idOrSlug}`),
  });
}

export function useTicketKnowledgeLinks(
  ticketType: KnowledgeLinkTicketType,
  ticketId: string | undefined,
) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...linksKey, ticketType, ticketId, userId],
    enabled: Boolean(ticketId) && Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: TicketKnowledgeLink[] }>(
        `/knowledge/tickets/${ticketType}/${ticketId}/links`,
      );
      return result.data;
    },
  });
}

export function useLinkKnowledgeArticle(
  ticketType: KnowledgeLinkTicketType,
  ticketId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (articleId: string) =>
      apiFetch<TicketKnowledgeLink>(
        `/knowledge/tickets/${ticketType}/${ticketId}/links`,
        { method: "POST", body: { articleId } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...linksKey, ticketType, ticketId],
      });
    },
  });
}

export function useUnlinkKnowledgeArticle(
  ticketType: KnowledgeLinkTicketType,
  ticketId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (articleId: string) =>
      apiFetch<{ ok: true }>(
        `/knowledge/tickets/${ticketType}/${ticketId}/links/${articleId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...linksKey, ticketType, ticketId],
      });
    },
  });
}
