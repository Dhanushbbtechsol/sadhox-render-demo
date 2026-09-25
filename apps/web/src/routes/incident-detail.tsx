import { Link, useParams } from "react-router";

import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIncident } from "@/hooks/use-tickets";

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useIncident(id);

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Incident not found"
        description={error instanceof Error ? error.message : "This ticket does not exist."}
        action={
          <Button render={<Link to="/incidents" />}>Back to queue</Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">{data.id}</span>
          <PriorityBadge priority={data.priority} />
          <Badge variant="outline">{data.status}</Badge>
          <Badge variant="secondary">{data.category}</Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{data.description}</p>
      </div>

      <dl className="border-border grid gap-3 border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-xs">Impact</dt>
          <dd>{data.impact}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Urgency</dt>
          <dd>{data.urgency}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Assignee</dt>
          <dd>{data.assignedTo ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">SLA due</dt>
          <dd>{data.slaDueAt ? new Date(data.slaDueAt).toLocaleString() : "—"}</dd>
        </div>
      </dl>

      <p className="text-muted-foreground text-xs">
        Comments and live updates arrive in Phase 2.
      </p>
    </div>
  );
}
