import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/hooks/use-tickets";
import { useAuthStore } from "@/stores/auth-store";

export default function PortalPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useIncidents();

  const mine = data?.filter(
    (incident) =>
      incident.reporterId === user?.id || incident.reporterId.startsWith("user-end"),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">End-user portal</h1>
          <p className="text-muted-foreground text-xs">
            Report an issue and track status of your tickets.
          </p>
        </div>
        <CreateIncidentDialog triggerLabel="Report an issue" />
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
        <div className="border-border divide-border divide-y border">
          {mine.map((incident) => (
            <div key={incident.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">{incident.id}</span>
                  <PriorityBadge priority={incident.priority} showLabel={false} />
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
                <p className="text-sm font-medium">{incident.title}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
