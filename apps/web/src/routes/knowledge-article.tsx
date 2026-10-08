import { ArrowLeftIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKnowledgeArticle } from "@/hooks/use-knowledge";

export default function KnowledgeArticlePage() {
  const { slug } = useParams();
  const { data, isLoading, isError, error } = useKnowledgeArticle(slug);

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Article not found"
        description={
          error instanceof Error
            ? error.message
            : "This article does not exist or is not Published."
        }
        action={
          <Button render={<Link to="/knowledge" />}>Back to Knowledge Base</Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in-up">
      <Button
        variant="ghost"
        size="sm"
        render={<Link to="/knowledge" />}
        className="-ml-2"
      >
        <ArrowLeftIcon />
        Back to Knowledge Base
      </Button>

      <Card className="overflow-hidden">
        <div className="from-primary/12 via-accent/40 to-transparent h-1.5 bg-gradient-to-r" />
        <CardHeader className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {data.categoryName ? (
              <Badge variant="secondary">{data.categoryName}</Badge>
            ) : null}
            {data.status === "Draft" ? (
              <Badge variant="outline">Draft</Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {data.title}
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Updated {new Date(data.updatedAt).toLocaleString()}
            {data.authorName ? ` · ${data.authorName}` : ""}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {data.body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
