import { useState } from "react";
import { Link } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
import { useProblems } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";
import { PROBLEM_STATUS_LABELS } from "@/types/itsm";

const PAGE_SIZE = 20;

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useProblems({
    page,
    pageSize: PAGE_SIZE,
  });
  const problems = data?.data;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
        <p className="text-muted-foreground text-sm">
          Root-cause records linked to recurring incidents.
        </p>
      </div>

      {isLoading ? <TicketListSkeleton /> : null}

      {isError ? (
        <EmptyState
          title="Could not load problems"
          description={error instanceof Error ? error.message : "Unknown error"}
        />
      ) : null}

      {!isLoading && !isError && problems?.length === 0 ? (
        <EmptyState
          title="No problems recorded"
          description="Problem records will appear here once agents link recurring incidents."
        />
      ) : null}

      {!isLoading && problems && problems.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {problems.map((problem, index) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.id}`}
                className={cn(
                  "border-border/80 bg-card block space-y-2.5 rounded-xl border px-4 py-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift animate-in-up",
                  index === 1 && "stagger-1",
                  index === 2 && "stagger-2",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground bg-muted/80 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    {problem.id.slice(0, 8)}
                  </span>
                  <Badge variant="outline">
                    {PROBLEM_STATUS_LABELS[problem.status]}
                  </Badge>
                  {problem.knownError ? (
                    <Badge variant="warning">Known error</Badge>
                  ) : null}
                </div>
                <p className="text-sm font-semibold tracking-tight">
                  {problem.title}
                </p>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {problem.description}
                </p>
                <p className="text-muted-foreground text-xs">
                  Linked incidents:{" "}
                  {problem.linkedIncidentIds.length
                    ? problem.linkedIncidentIds
                        .map((id) => id.slice(0, 8))
                        .join(", ")
                    : "None"}
                </p>
              </Link>
            ))}
          </div>

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={meta?.total ?? problems.length}
            onPageChange={setPage}
            label="problems"
          />
        </div>
      ) : null}
    </div>
  );
}
