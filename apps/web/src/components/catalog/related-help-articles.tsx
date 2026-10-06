import { Link } from "react-router";
import { BookOpenIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useKnowledgeArticles,
  useKnowledgeCategories,
} from "@/hooks/use-knowledge";

/**
 * Related help uses the Phase 5 convention: knowledge category `name`
 * matches catalog item `department` (see knowledge.seed + CATALOG_SEED).
 */
export function RelatedHelpArticles({
  department,
}: {
  department: string;
}) {
  const categories = useKnowledgeCategories();
  const category = (categories.data ?? []).find(
    (row) => row.name.toLowerCase() === department.toLowerCase(),
  );

  const articles = useKnowledgeArticles({
    categoryId: category?.id,
    requireCategory: true,
  });

  if (categories.isLoading || (category && articles.isLoading)) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Related help articles
        </p>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  if (!category) {
    return null;
  }

  const published = (articles.data ?? []).filter(
    (article) => article.status === "Published",
  );

  if (published.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Related help articles
        </p>
        <p className="text-muted-foreground text-xs">
          No published help articles for {department} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Related help articles
      </p>
      <ul className="space-y-1.5">
        {published.map((article) => (
          <li key={article.id}>
            <Link
              to={`/knowledge/${article.slug}`}
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <BookOpenIcon className="size-3.5 shrink-0" />
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
