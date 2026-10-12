import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  TicketIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { CreateIncidentDialog } from "@/components/incidents/create-incident-dialog";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { LIST_PAGE_SIZE, ListPagination } from "@/components/list-pagination";
import { PriorityBadge } from "@/components/priority-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";
import { useIncidents } from "@/hooks/use-tickets";
import { recordReference } from "@/lib/record-reference";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { INCIDENT_STATUS_LABELS, type IncidentStatus } from "@/types/itsm";

import EndUserIncidentsPage from "./end-user-incidents";

const PAGE_SIZE = LIST_PAGE_SIZE;

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
  const role = useAuthStore((s) => s.user?.role);
  if (role === "EndUser") {
    return <EndUserIncidentsPage />;
  }

  return <AgentIncidentsPage />;
}

function AgentIncidentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [focusIndex, setFocusIndex] = useState(0);
  const { data: projects = [] } = useProjects();

  useEffect(() => {
    setPage(1);
  }, [sortBy, sortDir, statusFilter, projectFilter]);

  const { data, isLoading, isError, error } = useIncidents({
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    status: statusFilter === "all" ? undefined : statusFilter,
    projectId: projectFilter === "all" ? undefined : projectFilter,
  });

  const projectName = (id: string | null | undefined) => {
    if (!id) return "—";
    return projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  };

  const incidents = data?.data;
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const openCount =
    incidents?.filter((i) => i.status !== "Resolved" && i.status !== "Closed")
      .length ?? 0;
  const p1Count = incidents?.filter((i) => i.priority === "P1").length ?? 0;
  const inProgress =
    incidents?.filter((i) => i.status === "InProgress").length ?? 0;
  const resolved =
    incidents?.filter((i) => i.status === "Resolved" || i.status === "Closed")
      .length ?? 0;

  useEffect(() => {
    if (!incidents?.length) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setFocusIndex((i) => Math.min((incidents?.length ?? 1) - 1, i + 1));
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      } else if (event.key === "Enter") {
        const row = incidents?.[focusIndex];
        if (row) {
          event.preventDefault();
          window.location.assign(`/incidents/${row.id}`);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [incidents, focusIndex]);

  useEffect(() => {
    setFocusIndex(0);
  }, [page, statusFilter, projectFilter, sortBy, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm">
            Prioritize work, watch response time, and open tickets in one place.
          </p>
        </div>
        <CreateIncidentDialog />
      </div>

      {!isLoading && incidents && incidents.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open (page)" value={openCount} icon={TicketIcon} tone="primary" />
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
        <Select
          items={[
            { value: "all", label: "All statuses" },
            ...(
              Object.keys(INCIDENT_STATUS_LABELS) as IncidentStatus[]
            ).map((status) => ({
              value: status,
              label: INCIDENT_STATUS_LABELS[status],
            })),
          ]}
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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
          items={{
            all: "All projects",
            ...Object.fromEntries(
              projects.map((project) => [project.id, project.name]),
            ),
          }}
          value={projectFilter}
          onValueChange={(v) => v && setProjectFilter(v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Project">
              {(value: string | null) => {
                if (!value || value === "all") return "All projects";
                return (
                  projects.find((p) => p.id === value)?.name ?? "Project"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All projects">
              All projects
            </SelectItem>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                label={project.name}
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "createdAt", label: "Created" },
            { value: "priority", label: "Priority" },
            { value: "status", label: "Status" },
            { value: "slaDueAt", label: "Response due" },
          ]}
          value={sortBy}
          onValueChange={(v) => v && setSortBy(v as SortKey)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="slaDueAt">Response due</SelectItem>
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "desc", label: "Descending" },
            { value: "asc", label: "Ascending" },
          ]}
          value={sortDir}
          onValueChange={(v) => v && setSortDir(v as "asc" | "desc")}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-muted-foreground hidden text-[11px] md:block">
          j/k or ↑↓ to move · Enter to open
        </p>
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
          title={
            projectFilter !== "all"
              ? "No incidents in this project"
              : "No incidents yet"
          }
          description={
            projectFilter !== "all"
              ? "Only tickets linked to this project appear here. Leave project blank on create to keep them under All projects, or set the project on the ticket detail."
              : "Create the first ticket to populate the agent queue."
          }
          action={
            projectFilter === "all" ? (
              <CreateIncidentDialog triggerLabel="Create first incident" />
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && incidents && incidents.length > 0 ? (
        <div className="space-y-3">
          {/* Mobile / tablet card list */}
          <div className="space-y-2 md:hidden">
            {incidents.map((incident, index) => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className={cn(
                  "border-border/80 bg-card block space-y-2 rounded-xl border px-4 py-3.5 shadow-soft transition-colors",
                  index === focusIndex && "ring-primary/40 ring-2",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={incident.priority} showLabel={false} />
                  <Badge variant={statusVariant(incident.status)}>
                    {INCIDENT_STATUS_LABELS[incident.status]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{incident.category}</span>
                </div>
                <p className="text-sm font-semibold tracking-tight">{incident.title}</p>
                <p className="text-muted-foreground text-xs">
                  {projectName(incident.projectId)} ·{" "}
                  {incident.assigneeName ?? "Unassigned"} ·{" "}
                  {new Date(incident.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="border-border/80 bg-card hidden overflow-hidden rounded-xl border shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Project</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Category</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="hidden px-4 py-3 font-medium xl:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident, index) => (
                    <tr
                      key={incident.id}
                      tabIndex={0}
                      onFocus={() => setFocusIndex(index)}
                      className={cn(
                        "border-border/60 hover:bg-muted/30 border-t transition-colors outline-none",
                        index === focusIndex && "bg-muted/40",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="hover:text-primary font-medium tracking-tight transition-colors"
                        >
                          {incident.title}
                        </Link>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                          {recordReference(incident.referenceCode)}
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
                      <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                        {projectName(incident.projectId)}
                      </td>
                      <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                        {incident.category}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {incident.assigneeName ?? "Unassigned"}
                      </td>
                      <td className="text-muted-foreground hidden px-4 py-3 whitespace-nowrap xl:table-cell">
                        {new Date(incident.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={meta?.total ?? incidents.length}
            onPageChange={setPage}
            label="incidents"
          />
        </div>
      ) : null}
    </div>
  );
}
