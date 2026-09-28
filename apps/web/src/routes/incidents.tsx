import { AlertCircleIcon, CheckCircle2Icon, Clock3Icon, TicketIcon } from "lucide-react";
import { Link } from "react-router";

import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import { useIncidents } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "In Progress") return "default" as const;
  return "outline" as const;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  className,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "success" | "muted";
  className?: string;
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-amber-800 dark:text-amber-300",
    success: "bg-success/12 text-success",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <div
      className={cn(
        "border-border/80 bg-card group rounded-xl border p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift animate-in-up",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
            toneClass,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const { data, isLoading, isError, error } = useIncidents();

  const openCount =
    data?.filter((i) => i.status !== "Resolved" && i.status !== "Closed").length ?? 0;
  const p1Count = data?.filter((i) => i.priority === "P1").length ?? 0;
  const inProgress = data?.filter((i) => i.status === "In Progress").length ?? 0;
  const resolved = data?.filter((i) => i.status === "Resolved" || i.status === "Closed").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Incident queue</h1>
          <p className="text-muted-foreground text-sm">
            Prioritize work, watch SLA pressure, and open tickets in one place.
          </p>
        </div>
        <CreateIncidentDialog />
      </div>

      {!isLoading && data && data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open" value={openCount} icon={TicketIcon} tone="primary" />
          <StatCard
            label="Critical P1"
            value={p1Count}
            icon={AlertCircleIcon}
            tone="warning"
            className="stagger-1"
          />
          <StatCard
            label="In progress"
            value={inProgress}
            icon={Clock3Icon}
            tone="muted"
            className="stagger-2"
          />
          <StatCard
            label="Resolved"
            value={resolved}
            icon={CheckCircle2Icon}
            tone="success"
            className="stagger-3"
          />
        </div>
      ) : null}

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
        <div className="space-y-2">
          {data.map((incident, index) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className={cn(
                "border-border/80 bg-card group relative flex flex-col gap-3 overflow-hidden rounded-xl border px-4 py-3.5 shadow-soft transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift",
                "sm:flex-row sm:items-center sm:justify-between",
                "animate-in-up",
                index === 1 && "stagger-1",
                index === 2 && "stagger-2",
                index === 3 && "stagger-3",
              )}
            >
              <span className="bg-primary absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 rounded-r-full transition-transform duration-200 group-hover:scale-y-100" />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground bg-muted/80 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    {incident.id}
                  </span>
                  <PriorityBadge priority={incident.priority} showLabel={false} />
                  <Badge variant={statusVariant(incident.status)}>{incident.status}</Badge>
                </div>
                <p className="group-hover:text-primary truncate text-sm font-semibold tracking-tight transition-colors">
                  {incident.title}
                </p>
                <p className="text-muted-foreground text-xs">
                  {incident.category}
                  {incident.assignedTo ? ` · ${incident.assignedTo}` : " · Unassigned"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(incident.createdAt).toLocaleString()}
                </span>
                <span className="text-primary text-xs font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  View details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
