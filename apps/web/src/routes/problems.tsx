import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { useProblems } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";

export default function ProblemsPage() {
  const { data, isLoading, isError, error } = useProblems();

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

      {!isLoading && !isError && data?.length === 0 ? (
        <EmptyState
          title="No problems recorded"
          description="Problem records will appear here once agents link recurring incidents."
        />
      ) : null}

      {!isLoading && data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((problem, index) => (
            <div
              key={problem.id}
              className={cn(
                "border-border/80 bg-card space-y-2.5 rounded-xl border px-4 py-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift animate-in-up",
                index === 1 && "stagger-1",
                index === 2 && "stagger-2",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground bg-muted/80 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                  {problem.id}
                </span>
                <Badge variant="outline">{problem.status}</Badge>
                {problem.knownError ? <Badge variant="warning">Known error</Badge> : null}
              </div>
              <p className="text-sm font-semibold tracking-tight">{problem.title}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{problem.description}</p>
              <p className="text-muted-foreground text-xs">
                Linked incidents: {problem.linkedIncidentIds.join(", ") || "None"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
