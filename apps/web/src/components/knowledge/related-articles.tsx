import { BookOpenIcon, LinkIcon, UnlinkIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useKnowledgeArticles,
  useLinkKnowledgeArticle,
  useTicketKnowledgeLinks,
  useUnlinkKnowledgeArticle,
} from "@/hooks/use-knowledge";
import { useAuthStore } from "@/stores/auth-store";
import type { KnowledgeLinkTicketType } from "@/types/knowledge";
import { cn } from "@/lib/utils";

export function RelatedArticles({
  ticketType,
  ticketId,
  readOnly = false,
}: {
  ticketType: KnowledgeLinkTicketType;
  ticketId: string;
  /** Portal / EndUser: list only, no link/unlink controls. */
  readOnly?: boolean;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const canMutate =
    !readOnly && (role === "Admin" || role === "Agent");

  const links = useTicketKnowledgeLinks(ticketType, ticketId);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const articles = useKnowledgeArticles({
    q: search || undefined,
    enabled: canMutate,
  });
  const linkMutation = useLinkKnowledgeArticle(ticketType, ticketId);
  const unlinkMutation = useUnlinkKnowledgeArticle(ticketType, ticketId);

  const linkedIds = new Set(links.data?.map((l) => l.articleId) ?? []);

  async function handleLink(articleId: string) {
    try {
      await linkMutation.mutateAsync(articleId);
      toast.success("Article linked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Link failed");
    }
  }

  async function handleUnlink(articleId: string) {
    try {
      await unlinkMutation.mutateAsync(articleId);
      toast.success("Article unlinked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlink failed");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpenIcon className="text-muted-foreground size-4" />
        <h2 className="text-sm font-semibold tracking-tight">
          Related articles
        </h2>
      </div>

      {links.isLoading ? <Skeleton className="h-16" /> : null}
      {links.isError ? (
        <p className="text-muted-foreground text-sm">
          Unable to load linked articles.
        </p>
      ) : null}

      {links.data && links.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {canMutate
            ? "No articles linked yet. Search Published articles below."
            : "No related help articles for this ticket."}
        </p>
      ) : null}

      {links.data && links.data.length > 0 ? (
        <ul className="space-y-2">
          {links.data.map((link) => (
            <li
              key={link.id}
              className="border-border/80 bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm"
            >
              <Link
                to={`/knowledge/${link.article.slug}`}
                className="hover:text-primary min-w-0 font-medium transition-colors"
              >
                {link.article.title}
              </Link>
              {canMutate ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={unlinkMutation.isPending}
                  onClick={() => void handleUnlink(link.articleId)}
                  aria-label={`Unlink ${link.article.title}`}
                >
                  <UnlinkIcon className="size-3.5" />
                  Unlink
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canMutate ? (
        <div className="space-y-2 pt-1">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(query.trim());
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Published articles…"
              aria-label="Search knowledge articles"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>

          {search ? (
            <div className="space-y-1.5">
              {articles.isLoading ? (
                <p className="text-muted-foreground text-xs">Searching…</p>
              ) : null}
              {articles.data && articles.data.length === 0 ? (
                <p className="text-muted-foreground text-xs">No matches.</p>
              ) : null}
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {articles.data?.map((article) => {
                  const already = linkedIds.has(article.id);
                  return (
                    <li
                      key={article.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm",
                        already ? "opacity-60" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="min-w-0 truncate">{article.title}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={already || linkMutation.isPending}
                        onClick={() => void handleLink(article.id)}
                      >
                        <LinkIcon className="size-3.5" />
                        {already ? "Linked" : "Link"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
