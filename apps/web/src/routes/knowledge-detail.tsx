import { Link, useParams } from "react-router";
import { ArrowLeftIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgeArticle } from "@/hooks/use-knowledge";
import { useAuthStore } from "@/stores/auth-store";

function renderBody(body: string) {
  return body.split("\n").map((line, index) => {
    if (!line.trim()) {
      return <br key={index} />;
    }
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={index} className="text-sm leading-relaxed">
        {parts.map((part, partIndex) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIndex} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={partIndex}>{part}</span>;
        })}
      </p>
    );
  });
}

export default function KnowledgeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = useKnowledgeArticle(slug);
  const role = useAuthStore((s) => s.user?.role);
  const knowledgeHome = role === "Admin" ? "/admin/knowledge" : "/knowledge";

  if (article.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-3/4 max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (article.isError || !article.data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={knowledgeHome} />}
          className="-ml-2"
        >
          <ArrowLeftIcon />
          Back to Knowledge Base
        </Button>
        <EmptyState
          title="Article not found"
          description="This article may be unpublished or the link is incorrect."
          action={
            <Button render={<Link to={knowledgeHome} />}>Browse articles</Button>
          }
        />
      </div>
    );
  }

  const data = article.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={knowledgeHome} />}
          className="-ml-2"
        >
          <ArrowLeftIcon />
          Back to Knowledge Base
        </Button>
        {role === "Admin" ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/admin/knowledge/${data.id}`} />}
          >
            Edit article
          </Button>
        ) : null}
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.categoryName}</Badge>
          {data.status === "Draft" ? (
            <Badge variant="warning">Draft</Badge>
          ) : (
            <Badge variant="secondary">Published</Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
        <p className="text-muted-foreground text-xs">
          Updated {new Date(data.updatedAt).toLocaleString()}
        </p>
      </header>

      <article className="border-border/80 bg-card space-y-3 rounded-2xl border p-5 shadow-soft sm:p-6">
        {renderBody(data.body)}
      </article>

      <div className="flex flex-wrap gap-2">
        <Button
          render={
            <Link
              to={
                data.categoryName
                  ? `/catalog?department=${encodeURIComponent(data.categoryName)}`
                  : "/catalog"
              }
            />
          }
        >
          Start a catalog request
        </Button>
        <Button variant="outline" render={<Link to="/incidents" />}>
          Report a ticket
        </Button>
      </div>
    </div>
  );
}
