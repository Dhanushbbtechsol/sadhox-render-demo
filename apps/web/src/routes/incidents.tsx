import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  TicketIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidents } from "@/hooks/use-tickets";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUS_LABELS, type IncidentStatus } from "@/types/itsm";

function statusVariant(status: string) {
  if (status === "Resolved" || status === "Closed") return "success" as const;
  if (status === "InProgress") return "default" as const;
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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "primary" | "warning" | "progress" | "success";
  className?: string;
}) {
  const toneClass = {
    primary: "bg-gradient-to-br from-[#3D29D0] to-[#C25FFF] text-white shadow-[0_6px_16px_-4px_rgba(61,41,208,0.45)]",
    warning: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_6px_16px_-4px_rgba(245,158,11,0.4)]",
    progress: "bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-[0_6px_16px_-4px_rgba(14,165,233,0.4)]",
    success: "bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-[0_6px_16px_-4px_rgba(16,185,129,0.4)]",
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
            "flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
            toneClass,
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
}

type SortKey = "createdAt" | "priority" | "status" | "slaDueAt";

export default function IncidentsPage() {
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, isError, error } = useIncidents({
    sortBy,
    sortDir,
    status: statusFilter === "all" ? undefined : statusFilter,
    pageSize: 50,
  });

  const incidents = data?.data;

  const openCount =
    incidents?.filter((i) => i.status !== "Resolved" && i.status !== "Closed")
      .length ?? 0;
  const p1Count = incidents?.filter((i) => i.priority === "P1").length ?? 0;
  const inProgress =
    incidents?.filter((i) => i.status === "InProgress").length ?? 0;
  const resolved =
    incidents?.filter((i) => i.status === "Resolved" || i.status === "Closed")
      .length ?? 0;

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

      {!isLoading && incidents && incidents.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open" value={openCount} icon={TicketIcon} tone="primary" />
          <StatCard
            label="Critical P1"
            value={p1Count}
            icon={AlertTriangleIcon}
            tone="warning"
            className="stagger-1"
          />
          <StatCard
            label="In progress"
            value={inProgress}
            icon={LoaderCircleIcon}
            tone="progress"
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

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(INCIDENT_STATUS_LABELS) as IncidentStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {INCIDENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) => v && setSortBy(v as SortKey)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="slaDueAt">SLA due</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortDir}
          onValueChange={(v) => v && setSortDir(v as "asc" | "desc")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TicketListSkeleton /> : null}

      {isError ? (
        <EmptyState
          title="Could not load incidents"
          description={error instanceof Error ? error.message : "Unknown error"}
        />
      ) : null}

      {!isLoading && !isError && incidents?.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          description="Create the first ticket to populate the agent queue."
          action={<CreateIncidentDialog triggerLabel="Create first incident" />}
        />
      ) : null}

      {!isLoading && incidents && incidents.length > 0 ? (
        <div className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="border-border/60 hover:bg-muted/30 border-t transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="hover:text-primary font-medium tracking-tight transition-colors"
                      >
                        {incident.title}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                        {incident.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={incident.priority} showLabel={false} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(incident.status)}>
                        {INCIDENT_STATUS_LABELS[incident.status]}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{incident.category}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {incident.assigneeName ?? "Unassigned"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {new Date(incident.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
