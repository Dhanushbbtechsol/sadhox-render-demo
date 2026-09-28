import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS } from "@/types/itsm";

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "InProgress") return "default" as const;
  return "outline" as const;
}

export default function PortalPage() {
  const { data, isLoading } = useIncidents({ pageSize: 50 });
  const mine = data?.data;

  return (
    <div className="space-y-6">
      <div className="from-primary/10 via-card to-card border-border/80 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-soft animate-in-up">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">My portal</h1>
            <p className="text-muted-foreground max-w-md text-sm">
              Report an issue and track status of your tickets without leaving this page.
            </p>
          </div>
          <CreateIncidentDialog triggerLabel="Report an issue" />
        </div>
        <div className="bg-primary/5 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-2xl" />
      </div>

      {isLoading ? <TicketListSkeleton rows={3} /> : null}

      {!isLoading && (!mine || mine.length === 0) ? (
        <EmptyState
          title="No tickets yet"
          description="When you report an incident it will show up here with live status."
          action={<CreateIncidentDialog triggerLabel="Report an issue" />}
        />
      ) : null}

      {!isLoading && mine && mine.length > 0 ? (
        <div className="space-y-2">
          {mine.map((incident, index) => (
            <div
              key={incident.id}
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
                </div>
                <p className="text-sm font-semibold tracking-tight">{incident.title}</p>
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(incident.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
