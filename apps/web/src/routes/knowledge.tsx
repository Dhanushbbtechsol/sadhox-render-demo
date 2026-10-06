import { BookOpenIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useKnowledgeArticles,
  useKnowledgeCategories,
} from "@/hooks/use-knowledge";
import { cn } from "@/lib/utils";

/** Read-only Knowledge browse for Agent / EndUser / Admin (Dev B may enrich later). */
export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const categories = useKnowledgeCategories();
  const articles = useKnowledgeArticles({
    q: search || undefined,
    categoryId,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in-up">
      <div className="space-y-1.5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookOpenIcon className="size-6" />
          Knowledge Base
        </h1>
        <p className="text-muted-foreground text-sm">
          Browse Published help articles. Search by keyword or filter by category.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          aria-label="Search knowledge articles"
        />
        <Button type="submit" className="sm:w-auto">
          Search
        </Button>
      </form>

      {categories.data && categories.data.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={categoryId ? "outline" : "default"}
            onClick={() => setCategoryId(undefined)}
          >
            All
          </Button>
          {categories.data.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={categoryId === category.id ? "default" : "outline"}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      ) : null}

      {articles.isLoading ? <TicketListSkeleton rows={4} /> : null}

      {!articles.isLoading && (!articles.data || articles.data.length === 0) ? (
        <EmptyState
          title="No articles found"
          description="Try another search, or clear the category filter."
        />
      ) : null}

      {articles.data && articles.data.length > 0 ? (
        <ul className="space-y-2">
          {articles.data.map((article, index) => (
            <li key={article.id}>
              <Link
                to={`/knowledge/${article.slug}`}
                className={cn(
                  "border-border/80 bg-card hover:border-primary/25 block rounded-xl border px-4 py-3.5 shadow-soft transition-colors animate-in-up",
                  index === 1 && "stagger-1",
                  index === 2 && "stagger-2",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-tight">
                    {article.title}
                  </p>
                  {article.categoryName ? (
                    <Badge variant="secondary">{article.categoryName}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                  {article.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
