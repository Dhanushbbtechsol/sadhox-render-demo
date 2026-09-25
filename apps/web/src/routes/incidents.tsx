import { Link } from "react-router";

import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/hooks/use-tickets";

export default function IncidentsPage() {
  const { data, isLoading, isError, error } = useIncidents();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Incident queue</h1>
          <p className="text-muted-foreground text-xs">
            Agent workspace — stub data until live CRUD is wired in Phase 2.
          </p>
        </div>
        <CreateIncidentDialog />
      </div>

      {isLoading ? <TicketListSkeleton /> : null}

      {isError ? (
        <EmptyState
          title="Could not load incidents"
          description={error instanceof Error ? error.message : "Unknown error"}
        />
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          description="Create the first ticket to populate the agent queue."
          action={<CreateIncidentDialog triggerLabel="Create first incident" />}
        />
      ) : null}

      {!isLoading && data && data.length > 0 ? (
        <div className="border-border divide-border divide-y border">
          {data.map((incident) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="hover:bg-muted/40 flex flex-col gap-2 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {incident.id}
                  </span>
                  <PriorityBadge priority={incident.priority} showLabel={false} />
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
                <p className="truncate text-sm font-medium">{incident.title}</p>
                <p className="text-muted-foreground text-xs">
                  {incident.category}
                  {incident.assignedTo ? ` · ${incident.assignedTo}` : " · Unassigned"}
                </p>
              </div>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {new Date(incident.createdAt).toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
