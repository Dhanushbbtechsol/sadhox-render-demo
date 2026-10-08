import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { BookOpenIcon, SearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useKnowledgeArticles,
  useKnowledgeCategories,
} from "@/hooks/use-knowledge";
import { useAuthStore } from "@/stores/auth-store";

export default function KnowledgePage() {
  const role = useAuthStore((s) => s.user?.role);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const categories = useKnowledgeCategories();
  const articles = useKnowledgeArticles({
    q,
    categoryId: categoryId === "all" ? undefined : categoryId,
  });

  const visible = useMemo(() => {
    const rows = articles.data ?? [];
    return rows.filter((a) => a.status === "Published");
  }, [articles.data]);

  // Admin uses the merged browse + authoring page
  if (role === "Admin") {
    return <Navigate to="/admin/knowledge" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-muted-foreground text-sm">
          Browse how-to articles by category or search by keyword. Showing
          published articles.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap animate-in-up">
        <div className="relative sm:max-w-sm sm:flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search articles"
            className="pl-9"
            aria-label="Search knowledge articles"
          />
        </div>
        <Select
          items={[
            { value: "all", label: "All categories" },
            ...(categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          value={categoryId}
          onValueChange={(value) => setCategoryId(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Category">
              {(value) => {
                if (!value || value === "all") return "All categories";
                return (
                  (categories.data ?? []).find((c) => c.id === value)?.name ??
                  "Category"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {articles.isLoading || categories.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {articles.isError ? (
        <p className="text-destructive text-sm">
          {articles.error instanceof Error
            ? articles.error.message
            : "Failed to load articles"}
        </p>
      ) : null}

      {!articles.isLoading && !articles.isError && visible.length === 0 ? (
        <EmptyState
          title="No articles found"
          description={
            q.trim() || categoryId !== "all"
              ? "Try a different search term or category filter."
              : "Published help articles will appear here once they are available."
          }
        />
      ) : null}

      {!articles.isLoading && visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((article, index) => (
            <li key={article.id} className={index === 1 ? "stagger-1" : undefined}>
              <Link
                to={`/knowledge/${article.slug}`}
                className="border-border/80 bg-card hover:border-primary/25 hover:shadow-lift group flex h-full flex-col gap-2 rounded-xl border p-4 shadow-soft transition-all duration-200 animate-in-up"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                    <BookOpenIcon className="size-4" />
                  </span>
                  <Badge variant="outline">{article.categoryName}</Badge>
                </div>
                <p className="group-hover:text-primary text-sm font-semibold tracking-tight transition-colors">
                  {article.title}
                </p>
                <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                  {article.body.replace(/\*\*/g, "").slice(0, 140)}
                  {article.body.length > 140 ? "…" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
