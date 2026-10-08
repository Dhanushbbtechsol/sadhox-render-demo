import { useState } from "react";
import { Link } from "react-router";

import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS } from "@/types/itsm";

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "InProgress") return "default" as const;
  return "outline" as const;
}

/** EndUser incidents desk — report + own list + live status (replaces My Portal). */
export default function EndUserIncidentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useIncidents({ page, pageSize: PAGE_SIZE });
  const mine = data?.data;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="from-primary/10 via-card to-card border-border/80 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-soft sm:p-6 animate-in-up">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
            <p className="text-muted-foreground max-w-md text-sm">
              Report an issue and track status of your tickets without leaving this page.
            </p>
          </div>
          <CreateIncidentDialog triggerLabel="Report Incident" />
        </div>
        <div className="bg-primary/5 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-2xl" />
      </div>

      {isLoading ? <TicketListSkeleton rows={3} /> : null}

      {!isLoading && (!mine || mine.length === 0) ? (
        <EmptyState
          title="No tickets yet"
          description="When you report an incident it will show up here with live status."
          action={<CreateIncidentDialog triggerLabel="Report Incident" />}
        />
      ) : null}

      {!isLoading && mine && mine.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {mine.map((incident, index) => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className={cn(
                  "border-border/80 bg-card flex flex-col gap-3 rounded-xl border px-4 py-3.5 shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between animate-in-up",
                  index === 1 && "stagger-1",
                  index === 2 && "stagger-2",
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground bg-muted/80 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                      {incident.id.slice(0, 8)}
                    </span>
                    <PriorityBadge priority={incident.priority} showLabel={false} />
                    <Badge variant={statusVariant(incident.status)}>
                      {INCIDENT_STATUS_LABELS[incident.status]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {incident.category}
                      {incident.subcategory ? ` · ${incident.subcategory}` : ""}
                    </span>
                  </div>
                  <p className="text-sm font-semibold tracking-tight">{incident.title}</p>
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Date(incident.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={meta?.total ?? mine.length}
            onPageChange={setPage}
            label="tickets"
          />
        </div>
      ) : null}
    </div>
  );
}
