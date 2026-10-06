import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { KnowledgeArticle, KnowledgeCategory } from "@/types/api";

const CATEGORIES_KEY = ["knowledge-categories"] as const;
const ARTICLES_KEY = ["knowledge-articles"] as const;

export type KnowledgeArticleFilters = {
  q?: string;
  categoryId?: string;
  /** When true, skip fetch until categoryId is set */
  requireCategory?: boolean;
};

export function useKnowledgeCategories() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...CATEGORIES_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: KnowledgeCategory[] }>(
        "/knowledge/categories",
      );
      return result.data;
    },
  });
}

export function useKnowledgeArticles(filters: KnowledgeArticleFilters = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  const query = params.toString();
  const waitingOnCategory =
    Boolean(filters.requireCategory) && !filters.categoryId;

  return useQuery({
    queryKey: [...ARTICLES_KEY, userId, filters],
    enabled: Boolean(userId) && !waitingOnCategory,
    queryFn: async () => {
      const result = await apiFetch<{ data: KnowledgeArticle[] }>(
        `/knowledge/articles${query ? `?${query}` : ""}`,
      );
      return result.data;
    },
  });
}

export function useKnowledgeArticle(slug: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...ARTICLES_KEY, "slug", slug, userId],
    enabled: Boolean(userId && slug),
    queryFn: () =>
      apiFetch<KnowledgeArticle>(`/knowledge/articles/${slug}`),
  });
}
