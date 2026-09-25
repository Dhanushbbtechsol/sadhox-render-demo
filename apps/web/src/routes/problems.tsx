import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { useProblems } from "@/hooks/use-tickets";

export default function ProblemsPage() {
  const { data, isLoading, isError, error } = useProblems();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Problems</h1>
        <p className="text-muted-foreground text-xs">
          Root-cause records linked to recurring incidents (stub data).
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
        <div className="border-border divide-border divide-y border">
          {data.map((problem) => (
            <div key={problem.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">{problem.id}</span>
                <Badge variant="outline">{problem.status}</Badge>
                {problem.knownError ? <Badge variant="warning">Known error</Badge> : null}
              </div>
              <p className="text-sm font-medium">{problem.title}</p>
              <p className="text-muted-foreground text-xs">{problem.description}</p>
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
